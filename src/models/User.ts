import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/database";
import { TenantNotFoundError } from "../utils/errors";

dotenv.config();

export interface IUser {
  id?: string; // UUID from the database
  full_name: string;
  email: string;
  phone?: string;
  user_role: string;
  birthday?: Date; // optional birthday field
  password?: string; // store the hashed password (optional for OAuth users)
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  isEmailVerified?: boolean;
  domain?: string;
  status?: "pending" | "active" | "disabled";
  createdAt?: Date;
  updatedAt?: Date;
  googleId?: string; // Google OAuth ID
  authProvider?: "local" | "google"; // Authentication provider
  profile_picture?: string; // Profile picture URL
}

export class User {
  private pepper = process.env.BCRYPT_PASSWORD || "";
  private saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

  constructor(public pool: Pool) { }
  private async hashPassword(password: string): Promise<string> {
    const saltedPassword = password + this.pepper;
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hash = await bcrypt.hash(saltedPassword, salt);
    return hash;
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    const saltedPassword = password + this.pepper;
    return await bcrypt.compare(saltedPassword, hash);
  }

  async createPasswordResettoken(email: string): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.pool.query(
      `
    UPDATE users
    SET "password_reset_token" = $1,
        "password_reset_expires" = $2
    WHERE email = $3
    `,
      [hashedToken, expiresAt, email],
    );

    return resetToken;
  }
  async clearResetToken(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users
     SET "password_reset_token" = NULL,
         "password_reset_expires" = NULL
     WHERE id = $1`,
      [userId],
    );
  }
  async findPasswordHashToken(passwordResetToken: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT
       id,
       "full_name",
       "email",
       "phone"
     FROM users
     WHERE "password_reset_token" = $1
       AND "password_reset_expires" > NOW()`,
      [passwordResetToken],
    );

    return result.rows[0] || null;
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.pool.query(
      `UPDATE users
     SET "password" = $1,
         "password_reset_token" = NULL,
         "password_reset_expires" = NULL
     WHERE id = $2`,
      [hashedPassword, userId],
    );
  }
  async getAll(): Promise<IUser[]> {
    const result = await this.pool.query(
      `SELECT
         id,
         "full_name",
         "email",
         "phone"
       FROM users`,
    );
    return result.rows;
  }

  async getByEmail(email: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT
         id,
         "full_name",
         "email",
         "phone"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] || null;
  }

  async create(user: IUser, subdomain?: string): Promise<IUser> {
    if (!user.password) {
      throw new Error("Password is required for local authentication");
    }

    const hashedPassword = await this.hashPassword(user.password);

    if (user.user_role === "customeradmin") {
      if (!user.domain) throw new Error("Domain is required for customer admins");

      // Ensure domain is unique
      const domainCheck = await this.pool.query(
        "SELECT id FROM users WHERE domain = $1 AND user_role = $2",
        [user.domain, "customeradmin"],
      );
      if ((domainCheck.rowCount ?? 0) > 0) {
        throw new Error("Domain already exists for another customer admin");
      }

      const result = await this.pool.query(
        `INSERT INTO users (full_name, email, phone, birthday, user_role, password, domain)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, phone, birthday, user_role, domain`,
        [
          user.full_name,
          user.email,
          user.phone,
          user.birthday,
          user.user_role,
          hashedPassword,
          user.domain,
        ],
      );

      return result.rows[0];
    }

    // Req should send header with the hostname e.g. "bmw"
    if (user.user_role === "client") {
      if (!subdomain) {
        throw new Error("Tenant subdomain is required");
      }

      const admin = await this.pool.query(
        "SELECT id FROM users WHERE user_role = $1 AND domain = $2",
        ["customeradmin", subdomain],
      );

      if (admin.rowCount === 0) {
        throw new TenantNotFoundError(subdomain);
      }

      const result = await this.pool.query(
        `INSERT INTO users (
      full_name,
      email,
      phone,
      birthday,
      user_role,
      password,
      customer_admin_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, full_name, email, phone, birthday, user_role, customer_admin_id`,
        [
          user.full_name,
          user.email,
          user.phone,
          user.birthday,
          user.user_role,
          hashedPassword,
          admin.rows[0].id,
        ],
      );

      return result.rows[0];
    }

    throw new Error("Invalid or unsupported user role");
  }

  async update(email: string, user: IUser): Promise<IUser | null> {
    if (!user.password) {
      throw new Error("Password is required");
    }
    const hashedPassword = await this.hashPassword(user.password);
    const result = await this.pool.query(
      `UPDATE users
         SET "full_name" = $1,
              "phone" = $2,
             "password"  = $3
       WHERE email = $4
       RETURNING
         id,
         "full_name" ,
         "email",
         "phone"`,
      [user.full_name, user.phone, hashedPassword, email],
    );
    return result.rows[0] || null;
  }
  async delete(email: string): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM users WHERE email = $1", [email]);
    return result.rowCount! > 0;
  }

  async authenticate(
    email: string,
    password: string,
    user_role: string,
    subdomain?: string,
  ): Promise<IUser | null> {
    if (user_role === "client") {
      if (!subdomain) throw new Error("Tenant subdomain is required");

      // 1️⃣ Find the customer admin for that subdomain
      const admin = await this.pool.query(
        `SELECT id FROM users WHERE domain = $1 AND user_role = 'customeradmin'`,
        [subdomain],
      );

      if (admin.rowCount === 0) {
        throw new Error(`Tenant '${subdomain}' not found`);
      }

      const customer_admin_id = admin.rows[0].id;

      // 2️⃣ Find the client under that admin
      const result = await this.pool.query(
        `SELECT id, full_name, email, phone, password, user_role
       FROM users
       WHERE email = $1 AND customer_admin_id = $2 AND user_role = 'client'`,
        [email, customer_admin_id],
      );

      const user = result.rows[0];
      if (user && (await this.comparePassword(password, user.password))) {
        return user;
      }

      return null;
    }

    const result = await this.pool.query(
      `SELECT id, full_name, email, phone, password, user_role
     FROM users
     WHERE email = $1 AND user_role = $2`,
      [email, user_role],
    );

    const user = result.rows[0];
    if (user && (await this.comparePassword(password, user.password))) {
      return user;
    }

    return null;
  }
  /** Find tenant (customer admin) by domain name */
  async findCustomerAdminByDomain(domain: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT id, full_name, email, phone, user_role, domain
       FROM users
       WHERE domain = $1 AND user_role = 'customeradmin'`,
      [domain],
    );
    return result.rows[0] || null;
  }

  /** Find a client under a specific tenant (customer admin) by email */
  async getClientByEmailAndAdmin(email: string, adminId: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT id, full_name, email, phone, user_role, customer_admin_id
       FROM users
       WHERE email = $1 AND customer_admin_id = $2 AND user_role = 'client'`,
      [email, adminId],
    );
    return result.rows[0] || null;
  }

  /** Find a customer admin by their email and domain */
  async getCustomerAdminByEmailAndDomain(email: string, domain: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT id, full_name, email, phone, user_role, domain
       FROM users
       WHERE email = $1 AND domain = $2 AND user_role = 'customeradmin'`,
      [email, domain],
    );
    return result.rows[0] || null;
  }

  /** Find any user by email and role (for administrators, etc.) */
  async getByEmailAndRole(email: string, role: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT id, full_name, email, phone, user_role
       FROM users
       WHERE email = $1 AND user_role = $2`,
      [email, role],
    );
    return result.rows[0] || null;
  }
  // ============= Google OAuth Static Methods =============

  static async findById(id: string): Promise<IUser | null> {
    const result = await pool.query(
      `SELECT
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture"
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  static async findByGoogleId(googleId: string): Promise<IUser | null> {
    const result = await pool.query(
      `SELECT
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture"
       FROM users
       WHERE "google_id" = $1`,
      [googleId],
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await pool.query(
      `SELECT
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] || null;
  }

  static async linkGoogleAccount(
    userId: string,
    googleId: string,
    profilePicture?: string,
  ): Promise<IUser> {
    const result = await pool.query(
      `UPDATE users
       SET "google_id" = $1,
           "auth_provider" = 'google',
           "profile_picture" = $2
       WHERE id = $3
       RETURNING
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture"`,
      [googleId, profilePicture, userId],
    );
    return result.rows[0];
  }

  static async createGoogleUser(userData: {
    googleId: string;
    email: string;
    full_name: string;
    profilePicture?: string | undefined;
    user_role?: string;
  }): Promise<IUser> {
    const role = userData.user_role || 'client'; // Default to 'client' if not specified
    const result = await pool.query(
      `INSERT INTO users (
         "full_name",
         "email",
         "google_id",
         "auth_provider",
         "profile_picture",
         "user_role"
       )
       VALUES ($1, $2, $3, 'google', $4, $5)
       RETURNING
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture",
         "user_role"`,
      [userData.full_name, userData.email, userData.googleId, userData.profilePicture, role],
    );
    return result.rows[0];
  }
}

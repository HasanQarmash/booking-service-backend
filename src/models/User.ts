import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/database";

dotenv.config();

export interface IUser {
  id?: string; // UUID from the database
  full_name: string;
  email: string;
  phone?: string;
  birthday?: Date; // optional birthday field
  password?: string; // store the hashed password (optional for OAuth users)
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  isEmailVerified?: boolean;
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

  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    const saltedPassword = password + this.pepper;
    return await bcrypt.compare(saltedPassword, hash);
  }

  async createPasswordResettoken(email: string): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

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
  async findPasswordHashToken(
    passwordResetToken: string,
  ): Promise<IUser | null> {
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

  async create(user: IUser): Promise<IUser> {
    if (!user.password) {
      throw new Error("Password is required for local authentication");
    }
    const hashedPassword = await this.hashPassword(user.password);
    const result = await this.pool.query(
      `INSERT INTO users ("full_name", "email", "phone","birthday", "password") VALUES ($1, $2, $3, $4, $5) RETURNING
         id,
         "full_name",
         "email",
         "phone",
          "birthday"`,
      [user.full_name, user.email, user.phone,user.birthday, hashedPassword],
    );
    return result.rows[0];
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
    const result = await this.pool.query("DELETE FROM users WHERE email = $1", [
      email,
    ]);
    return result.rowCount! > 0;
  }

  async authenticate(email: string, password: string): Promise<IUser | null> {
    const result = await this.pool.query(
      `SELECT id, "full_name", "email", "phone", "password"
        FROM users
        WHERE "email" = $1`,
      [email],
    );

    const user = result.rows[0];

    if (user && (await this.comparePassword(password, user.password))) {
      return user;
    }
    return null;
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
      [id]
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
      [googleId]
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
      [email]
    );
    return result.rows[0] || null;
  }

  static async linkGoogleAccount(
    userId: string,
    googleId: string,
    profilePicture?: string
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
      [googleId, profilePicture, userId]
    );
    return result.rows[0];
  }

  static async createGoogleUser(userData: {
    googleId: string;
    email: string;
    full_name: string;
    profilePicture?: string | undefined;
  }): Promise<IUser> {
    const result = await pool.query(
      `INSERT INTO users (
         "full_name",
         "email",
         "google_id",
         "auth_provider",
         "profile_picture"
       )
       VALUES ($1, $2, $3, 'google', $4)
       RETURNING
         id,
         "full_name",
         "email",
         "phone",
         "google_id" as "googleId",
         "auth_provider" as "authProvider",
         "profile_picture" as "profile_picture"`,
      [userData.full_name, userData.email, userData.googleId, userData.profilePicture]
    );
    return result.rows[0];
  }
}

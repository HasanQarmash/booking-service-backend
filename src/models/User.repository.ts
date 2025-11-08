import { Pool } from "pg";
import dotenv from "dotenv";
import { IUser } from "./User.interface";
import { UserPasswordService } from "./User.password.service";
import { TenantNotFoundError } from "../utils/errors";

dotenv.config();

export class User {
  private passwordService: UserPasswordService;

  constructor(public pool: Pool) {
    this.passwordService = new UserPasswordService(pool);
  }

  // Expose password service methods for backward compatibility
  async createPasswordResettoken(email: string): Promise<string> {
    return this.passwordService.createPasswordResetToken(email);
  }

  async clearResetToken(userId: string): Promise<void> {
    return this.passwordService.clearResetToken(userId);
  }

  async findPasswordHashToken(passwordResetToken: string): Promise<IUser | null> {
    return this.passwordService.findPasswordHashToken(passwordResetToken);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    return this.passwordService.resetPassword(userId, newPassword);
  }

  // CRUD Operations
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

    const hashedPassword = await this.passwordService.hashPassword(user.password);

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
    const hashedPassword = await this.passwordService.hashPassword(user.password);
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
      if (user && (await this.passwordService.comparePassword(password, user.password))) {
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
    if (user && (await this.passwordService.comparePassword(password, user.password))) {
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
}

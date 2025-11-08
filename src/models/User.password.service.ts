import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import { IUser } from "./User.interface";

dotenv.config();

export class UserPasswordService {
  private pepper = process.env.BCRYPT_PASSWORD || "";
  private saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

  constructor(private pool: Pool) {}

  async hashPassword(password: string): Promise<string> {
    const saltedPassword = password + this.pepper;
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hash = await bcrypt.hash(saltedPassword, salt);
    return hash;
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    const saltedPassword = password + this.pepper;
    return await bcrypt.compare(saltedPassword, hash);
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.pool.query(
      `UPDATE users
       SET "password_reset_token" = $1,
           "password_reset_expires" = $2
       WHERE email = $3`,
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
}

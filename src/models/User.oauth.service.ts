import pool from "../config/database";
import { IUser } from "./User.interface";

export class UserOAuthService {
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
      [userData.full_name, userData.email, userData.googleId, userData.profilePicture],
    );
    return result.rows[0];
  }
}

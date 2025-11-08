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

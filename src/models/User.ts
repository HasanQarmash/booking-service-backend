// Main export file for User model - re-exports from modular files
export type { IUser } from "./User.interface";
export { User } from "./User.repository";
export { UserPasswordService } from "./User.password.service";
export { UserOAuthService } from "./User.oauth.service";

// Re-export static methods for backward compatibility
import { UserOAuthService } from "./User.oauth.service";

export const UserOAuth = {
  findById: UserOAuthService.findById,
  findByGoogleId: UserOAuthService.findByGoogleId,
  findByEmail: UserOAuthService.findByEmail,
  linkGoogleAccount: UserOAuthService.linkGoogleAccount,
  createGoogleUser: UserOAuthService.createGoogleUser,
};

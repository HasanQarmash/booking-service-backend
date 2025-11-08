import { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { ValidationError } from "../utils/validators";
import { asyncHandler } from "../middlewares/errorHandler";
import { DuplicateEmailError, EmailError, NotFoundError } from "../utils/errors";
import { Email } from "../utils/email";
import crypto from "crypto";
import { createSendToken } from "../utils/createSendtoken";

export class AuthController {
  constructor(private userModel: User) {}

  register = asyncHandler(async (req, res) => {
    try {
      const subdomain = (req.headers["x-tenant-domain"] as string | undefined)?.toLowerCase();

      const newUser = await this.userModel.create(req.body, subdomain);

      // Build tenant-specific frontend URL
      let frontendBase = process.env.FRONTEND_URL || ""; // e.g. https://myapp.com

      // Remove protocol to safely inject subdomain
      const baseUrl = frontendBase.replace(/^https?:\/\//, "");

      // Construct full tenant URL (e.g., https://bmw.myapp.com)
      const tenantFrontendUrl = `https://${subdomain}.${baseUrl}/customer/welcome`;

      // 3️⃣ Send a welcome email (non-blocking)
      try {
        const emailService = new Email(newUser, tenantFrontendUrl);
        await emailService.sendWelcome();
      } catch (err: any) {
        console.error("⚠️ Failed to send welcome email:", err.message);
      }

      // 4️⃣ Send response + JWT
      createSendToken(newUser, 201, res, "User registered successfully");
    } catch (error: any) {
      if (error.code === "23505") {
        if (error.constraint === "unique_client_email_per_admin") {
          throw new ValidationError("Email already exists under this customer admin");
        }
        if (error.constraint === "unique_admin_email_per_domain") {
          throw new ValidationError("Email already exists under this domain");
        }
        throw new ValidationError("Email already exists");
      }
      throw error;
    }
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, user_role } = req.body;
    const subdomain = (req.headers["x-tenant-domain"] as string | undefined)?.toLowerCase();

    if (!email || !password || !user_role) {
      throw new ValidationError("Missing required fields: email or password");
    }

    const user = await this.userModel.authenticate(email, password, user_role, subdomain);
    if (!user) {
      throw new ValidationError("Invalid credentials");
    }

    createSendToken(user, 200, res, "Login successful");
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const { email, user_role, domain } = req.body;

    if (!email) throw new ValidationError("Missing required field: email");
    if (!user_role) throw new ValidationError("Missing required field: user_role");

    let user = null;
    const subdomain = (req.headers["x-tenant-domain"] as string | undefined)?.toLowerCase();

    if (user_role === "client") {
      if (!subdomain)
        throw new ValidationError("Missing tenant subdomain (x-tenant-domain header)");

      const admin = await this.userModel.findCustomerAdminByDomain(subdomain);
      if (!admin) throw new NotFoundError(`Tenant '${subdomain}' not found`);

      user = await this.userModel.getClientByEmailAndAdmin(email, admin.id!);
    } else if (user_role === "customeradmin") {
      if (!domain) throw new ValidationError("Domain is required for customer admins");
      user = await this.userModel.getCustomerAdminByEmailAndDomain(email, domain);
    } else if (user_role === "administrator") {
      user = await this.userModel.getByEmailAndRole(email, "administrator");
    }

    if (!user) throw new NotFoundError("User not found");

    const resetToken = await this.userModel.createPasswordResettoken(user.email);

    const frontendBase = process.env.FRONTEND_URL || "https://myapp.com";
    const baseUrl = frontendBase.replace(/^https?:\/\//, "");

    const resetURL = domain
      ? `https://${domain}.${baseUrl}/customer/new-password?token=${resetToken}`
      : subdomain
        ? `https://${subdomain}.${baseUrl}/customer/new-password?token=${resetToken}`
        : `${frontendBase}/customer/new-password?token=${resetToken}`;

    try {
      const emailService = new Email(user, resetURL);
      await emailService.sendPasswordReset();
      res.status(200).json({ message: "Password reset link sent successfully" });
    } catch (error: any) {
      console.error("❌ Email sending failed:", error.message);
      await this.userModel.clearResetToken(user.id!);
      throw new EmailError("There was an error sending the password reset email.");
    }
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError("Missing required fields: token or newPassword");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 3️⃣ Find the user by hashed token and ensure it's not expired
    const user = await this.userModel.findPasswordHashToken(hashedToken);
    if (!user) throw new NotFoundError("Invalid or expired reset token");

    // 4️⃣ Reset password using new model method
    await this.userModel.resetPassword(user.id!, newPassword);

    createSendToken(user, 200, res, "Password reset successful");
  });
}

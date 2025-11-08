import { Request, Response, NextFunction } from "express";
import {
  ValidationError,
  getMissingFields,
  validateFullName,
  validatePalestinePhone,
  validateEmail,
  validatePassword,
} from "../utils/validators";

/**
 * Validates user input for registration — including role-specific rules.
 */
export const validateUserInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { full_name, email, phone, password, user_role, domain } = req.body;
    const subdomain = (req.headers["x-tenant-domain"] as string | undefined)?.toLowerCase();

    // 1️⃣ Base required fields
    const missing = getMissingFields(req.body, [
      "full_name",
      "email",
      "phone",
      "password",
      "user_role",
    ]);
    if (missing.length) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
        type: "ValidationError",
      });
    }

    // 2️⃣ Validate base field formats
    validateFullName(full_name);
    validateEmail(email);
    validatePalestinePhone(phone);
    validatePassword(password);

    // 3️⃣ Role-specific validation
    if (user_role === "customeradmin") {
      if (!domain) {
        throw new ValidationError("Domain is required for customer admins");
      }
      if (domain.length < 3) {
        throw new ValidationError("Domain must be at least 3 characters long");
      }
    }

    if (user_role === "client") {
      if (!subdomain) {
        throw new ValidationError("Missing tenant subdomain header (x-tenant-domain)");
      }
    }

    // 4️⃣ Continue to controller
    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        message: err.message,
        type: "ValidationError",
      });
    }
    next(err);
  }
};

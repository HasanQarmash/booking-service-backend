import { Request, Response, NextFunction } from "express";
import {
  ValidationError,
  getMissingFields,
  validateFullName,
  validatePalestinePhone,
  validateEmail,
  validatePassword,
} from "../utils/validators";

export const validateUserInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { full_name, email, phone, password } = req.body;

    // Check missing fields
    const missing = getMissingFields(req.body, ["full_name", "email", "phone", "password"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    // Validate fields
    validateFullName(full_name);
    validateEmail(email);
    validatePalestinePhone(phone);
    validatePassword(password);

    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

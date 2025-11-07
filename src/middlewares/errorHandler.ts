import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/validators";

/**
 * Centralized error handling middleware
 * Should be added as the last middleware in the application
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      message: err.message,
      type: "ValidationError",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
      type: "AuthenticationError",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
      type: "AuthenticationError",
    });
  }

  if (err.name === "DuplicateEmailError") {
    return res.status(400).json({
      message: err.message,
      type: "DuplicateEmailError",
    });
  }

  if (err.name === "NotFoundError") {
    return res.status(404).json({
      message: err.message,
      type: "NotFoundError",
    });
  }

  if (err.name === "EmailError") {
    return res.status(500).json({
      message: err.message,
      type: "EmailError",
    });
  }
  if (err.name === "TenantNotFoundError") {
    return res.status(404).json({
      message: err.message,
      type: "TenantNotFoundError",
    });
  }

  // Default to 500 internal server error
  res.status(500).json({
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateEmailError";
  }
}

export class EmailError extends Error {
  constructor(message = "Failed to send email") {
    super(message);
    this.name = "EmailError";
  }
}

export class TenantNotFoundError extends Error {
  constructor(domain: string) {
    super(`No customer admin found for subdomain: ${domain}`);
    this.name = "TenantNotFoundError";
  }
}

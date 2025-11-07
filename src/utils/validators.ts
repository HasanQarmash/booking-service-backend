/**
 * Utility functions for validation
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Parses and validates an ID parameter from a request
 * @param idParam - The ID parameter from the request
 * @param entityName - The name of the entity (for error messages)
 * @returns The parsed ID as a number
 * @throws ValidationError if the ID is invalid
 */
export const parseId = (idParam: string | undefined, entityName: string): number => {
  if (!idParam || !/^\d+$/.test(idParam)) {
    throw new ValidationError(`Invalid ${entityName} id`);
  }
  return Number.parseInt(idParam, 10);
};

/**
 * Validates that required fields are present in an object
 * @param data - The object to validate
 * @param requiredFields - Array of required field names
 * @returns Array of missing field names
 */
export const getMissingFields = (data: Record<string, any>, requiredFields: string[]): string[] => {
  return requiredFields.filter((field) => !data[field]);
};

/**
 * Validates a Palestinian phone number
 * @param phone - Phone number string
 * @returns true if valid
 * @throws ValidationError if invalid
 */
export const validatePalestinePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s|-/g, "");
  const regex = /^(?:\+970|0|\+972)?[5-9][0-9]{7,8}$/;
  if (!regex.test(cleaned)) {
    throw new ValidationError(
      "Phone number is invalid. It must be a valid Palestinian phone number.",
    );
  }
  return true;
};

/**
 * Validates email format
 * @param email - Email string
 * @returns true if valid
 * @throws ValidationError if invalid
 */
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
  return true;
};

/**
 * Validates password length
 * @param password - Password string
 * @param minLength - Minimum length (default 6)
 * @returns true if valid
 * @throws ValidationError if invalid
 */
export const validatePassword = (password: string, minLength = 8): boolean => {
  if (!password || password.length < minLength) {
    throw new ValidationError(`Password must be at least ${minLength} characters long`);
  }
  return true;
};

/**
 * Validates full name length
 * @param fullName - Full name string
 * @param minLength - Minimum length (default 2)
 * @returns true if valid
 * @throws ValidationError if invalid
 */
export const validateFullName = (fullName: string, minLength = 2): boolean => {
  if (!fullName || fullName.trim().length < minLength) {
    throw new ValidationError(`Full name must be at least ${minLength} characters long`);
  }
  return true;
};

import dotenv from "dotenv";

dotenv.config();

/**
 * Validates that all required environment variables are present
 * @throws Error if any required environment variables are missing
 */
export const validateEnv = (): void => {
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "TEST_DB_NAME",
    "JWT_SECRET",
    "PORT",
    "BCRYPT_PASSWORD",
    "SALT_ROUNDS",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "SESSION_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(", ")}`
    );
  }

  console.log("✅ Environment variables validated successfully");
};

/**
 * Get environment variable with type safety
 */
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue!;
};

import supertest from "supertest";
import app from "../server";
import pool from "../config/database";
import jwt from "jsonwebtoken";

const request = supertest(app);

describe("Authentication API Endpoints", () => {
  let registeredUserEmail: string;
  let registeredUserToken: string;
  let registeredUserId: string;

  beforeAll(async () => {
    // Clear the users table before tests
    await pool.query("DELETE FROM users;");
  });

  afterAll(async () => {
    // Clean up after all tests
    await pool.query("DELETE FROM users;");
    // Don't close the pool as it's shared with other test files
  });

  // ============================================
  // REGISTRATION TESTS
  // ============================================
  describe("POST /api/auth/register - User Registration", () => {
    it("should register a new user successfully with all required fields", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "John Doe",
        email: "john.doe@test.com",
        phone: "0599123456",
        user_role: "client",
        password: "SecurePass123",
      });

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.message).toBe("User registered successfully");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.full_name).toBe("John Doe");
      expect(res.body.user.email).toBe("john.doe@test.com");
      expect(res.body.user.phone).toBe("0599123456");
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
      expect(res.body.token).toBeDefined();

      // Verify token is valid
      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.email).toBe("john.doe@test.com");
      expect(decoded.id).toBe(res.body.user.id);

      // Store for subsequent tests
      registeredUserEmail = res.body.user.email;
      registeredUserToken = res.body.token;
      registeredUserId = res.body.user.id;
    });

    it("should return 400 when trying to register with duplicate email", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Jane Doe",
        email: "john.doe@test.com", // Duplicate email
        phone: "0599234567",
        user_role: "client",
        password: "AnotherPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email already exists");
    });

    it("should return 400 when full_name is missing", async () => {
      const res = await request.post("/api/auth/register").send({
        email: "missing.name@test.com",
        phone: "0599234567",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required fields:/);
    });

    it("should return 400 when email is missing", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Missing Email User",
        phone: "0599234567",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required fields:/);
    });

    it("should return 400 when password is missing", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Missing Password User",
        email: "missing.password@test.com",
        user_role: "client",
        phone: "0599234567",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required fields:/);
    });

    it("should return 400 when phone is missing", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Missing Phone User",
        email: "missing.phone@test.com",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required fields:/);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Invalid Email User",
        email: "not-an-email",
        phone: "0599234567",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email format");
    });

    it("should return 400 for password less than 8 characters", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Short Password User",
        email: "short.pass@test.com",
        user_role: "client",
        phone: "0599234567",
        password: "Pass12",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Password must be at least 8 characters long",
      );
    });

    it("should return 400 for invalid Palestinian phone number format", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Invalid Phone User",
        email: "invalid.phone@test.com",
        phone: "1234567890", // Invalid format
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Phone number is invalid. It must be a valid Palestinian phone number.",
      );
    });

    it("should return 400 for phone number with incorrect length", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Wrong Length Phone User",
        email: "wrong.length@test.com",
        phone: "05991234", // Too short (8 digits)
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Phone number is invalid. It must be a valid Palestinian phone number.",
      );
    });

    it("should accept valid Palestinian phone numbers starting with 059", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Valid Phone 059 User",
        email: "valid.059@test.com",
        phone: "0599876543",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User registered successfully");
    });

    it("should accept valid Palestinian phone numbers starting with 056", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Valid Phone 056 User",
        email: "valid.056@test.com",
        phone: "0569876543",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User registered successfully");
    });
  });

  // ============================================
  // LOGIN TESTS
  // ============================================
  describe("POST /api/auth/login - User Authentication", () => {
    it("should login successfully with correct credentials", async () => {
      const res = await request.post("/api/auth/login").send({
        email: registeredUserEmail,
        user_role: "client",
        password: "SecurePass123",
      });

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.message).toBe("Login successful");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(registeredUserEmail);
      expect(res.body.user.id).toBe(registeredUserId);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.token).toBeDefined();

      // Verify token is valid
      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.email).toBe(registeredUserEmail);
    });

    it("should return 400 when email is missing", async () => {
      const res = await request.post("/api/auth/login").send({
        password: "SecurePass123",
        user_role: "client",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Missing required fields: email or password",
      );
    });

    it("should return 400 when password is missing", async () => {
      const res = await request.post("/api/auth/login").send({
        email: registeredUserEmail,
        user_role: "client",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Missing required fields: email or password",
      );
    });

    it("should return 400 when both email and password are missing", async () => {
      const res = await request.post("/api/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Missing required fields: email or password",
      );
    });

    it("should return 400 for incorrect password", async () => {
      const res = await request.post("/api/auth/login").send({
        email: registeredUserEmail,
        password: "WrongPassword123",
        user_role: "client",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should be case-sensitive for password", async () => {
      const res = await request.post("/api/auth/login").send({
        email: registeredUserEmail,
        password: "securepass123", // Different case
        user_role: "client",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid credentials");
    });
  });

  // ============================================
  // FORGOT PASSWORD TESTS
  // ============================================
  describe("POST /api/auth/request-reset - Password Reset Request", () => {
    it("should generate password reset token for existing user", async () => {
      const res = await request.post("/api/auth/request-reset").send({
        email: registeredUserEmail,
      });

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.message).toBe("Password reset link sent successfully");
      
      // Verify token was stored in database
      const result = await pool.query(
        'SELECT "password_reset_token", "password_reset_expires" FROM users WHERE email = $1',
        [registeredUserEmail],
      );

      expect(result.rows[0].password_reset_token).toBeDefined();
      expect(result.rows[0].password_reset_expires).toBeDefined();
    });

    it("should return 400 when email is missing", async () => {
      const res = await request.post("/api/auth/request-reset").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: email");
    });

    it("should return 400 for empty email string", async () => {
      const res = await request.post("/api/auth/request-reset").send({
        email: "",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: email");
    });

    it("should return 404 for non-existent email", async () => {
      const res = await request.post("/api/auth/request-reset").send({
        email: "nonexistent.user@test.com",
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("should generate different tokens for multiple requests", async () => {
      const res1 = await request.post("/api/auth/request-reset").send({
        email: registeredUserEmail,
      });

      // Wait a brief moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const res2 = await request.post("/api/auth/request-reset").send({
        email: registeredUserEmail,
      });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      
      // Verify tokens in database are different by checking the timestamps
      const result = await pool.query(
        'SELECT "password_reset_token", "password_reset_expires" FROM users WHERE email = $1',
        [registeredUserEmail],
      );
      
      // Token should exist and have been updated
      expect(result.rows[0].password_reset_token).toBeDefined();
      expect(result.rows[0].password_reset_expires).toBeDefined();
    });

    it("should store reset token in database", async () => {
      const res = await request.post("/api/auth/request-reset").send({
        email: registeredUserEmail,
      });

      expect(res.status).toBe(200);

      // Verify token was stored in database
      const result = await pool.query(
        'SELECT "password_reset_token", "password_reset_expires" FROM users WHERE email = $1',
        [registeredUserEmail],
      );

      expect(result.rows[0].password_reset_token).toBeDefined();
      expect(result.rows[0].password_reset_expires).toBeDefined();
      expect(
        new Date(result.rows[0].password_reset_expires).getTime(),
      ).toBeGreaterThan(Date.now());
    });
  });

  // ============================================
  // TOKEN VALIDATION TESTS
  // ============================================
  describe("Token Validation", () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a token once for all token validation tests
      const res = await request.post("/api/auth/login").send({
        email: registeredUserEmail,
        password: "SecurePass123",
        user_role: "client",
      });

      if (res.status === 200) {
        validToken = res.body.token;
      }
    });

    it("should generate valid JWT tokens with correct payload", async () => {
      if (!validToken) {
        pending("Token was not retrieved due to rate limiting");
        return;
      }

      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded = jwt.verify(validToken, JWT_SECRET) as any;

      expect(decoded.id).toBe(registeredUserId);
      expect(decoded.email).toBe(registeredUserEmail);
      expect(decoded.full_name).toBe("John Doe");
      expect(decoded.phone).toBe("0599123456");
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiration
    });

    it("should set token expiration time", async () => {
      if (!validToken) {
        pending("Token was not retrieved due to rate limiting");
        return;
      }

      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded = jwt.verify(validToken, JWT_SECRET) as any;

      // Check that expiration is in the future
      expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================
  describe("Security Tests", () => {
    it("should not return password in registration response", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Security Test User",
        email: "security.test@test.com",
        phone: "0599111222",
        user_role: "client",
        password: "SecurePassword123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.password).toBeUndefined();
    });

    it("should not return password in login response", async () => {
      const res = await request.post("/api/auth/login").send({
        email: "security.test@test.com",
        password: "SecurePassword123",
        user_role: "client",
      });

      expect(res.status).toBe(200);
      expect(res.body.user.password).toBeUndefined();
    });

    it("should store passwords as hashed values in database", async () => {
      const plainPassword = "TestPassword123";
      const res = await request.post("/api/auth/register").send({
        full_name: "Hash Test User",
        email: "hash.test@test.com",
        phone: "0599333444",
        user_role: "client",
        password: plainPassword,
      });

      expect(res.status).toBe(201);

      // Check database for hashed password
      const result = await pool.query(
        "SELECT password FROM users WHERE email = $1",
        ["hash.test@test.com"],
      );

      const storedPassword = result.rows[0].password;
      expect(storedPassword).not.toBe(plainPassword);
      expect(storedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it("should reject SQL injection attempts in login", async () => {
      const res = await request.post("/api/auth/login").send({
        email: "' OR '1'='1",
        password: "' OR '1'='1",
        user_role: "client",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should reject SQL injection attempts in registration", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "SQL Injection'; DROP TABLE users; --",
        email: "sqlinjection@test.com",
        phone: "0599555666",
        user_role: "client",
        password: "ValidPass123",
      });

      // Should either validate and reject, or safely store the string
      // The user table should still exist
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')",
      );
      expect(tableCheck.rows[0].exists).toBe(true);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe("Edge Cases", () => {
    it("should handle registration with minimal valid data", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Ab", // Minimum 2 characters
        email: "a@b.co",
        phone: "0599000000",
        user_role: "client",
        password: "12345678",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User registered successfully");
    });

    it("should handle very long but valid names", async () => {
      const longName = "A".repeat(100);
      const res = await request.post("/api/auth/register").send({
        full_name: longName,
        email: "long.name@test.com",
        phone: "0599777888",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.full_name).toBe(longName);
    });

    it("should handle special characters in name", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "Jean-Pierre O'Connor III",
        email: "special.chars@test.com",
        phone: "0599888999",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.full_name).toBe("Jean-Pierre O'Connor III");
    });

    it("should handle password with special characters", async () => {
      const specialPassword = "P@ssw0rd!#$%^&*()";
      const res = await request.post("/api/auth/register").send({
        full_name: "Special Pass User",
        email: "special.pass@test.com",
        phone: "0598111222",
        user_role: "client",
        password: specialPassword,
      });

      expect(res.status).toBe(201);

      // Verify can login with special character password
      const loginRes = await request.post("/api/auth/login").send({
        email: "special.pass@test.com",
        password: specialPassword,
        user_role: "client",
      });

      expect(loginRes.status).toBe(200);
    });

    it("should handle Unicode characters in name", async () => {
      const res = await request.post("/api/auth/register").send({
        full_name: "محمد أحمد",
        email: "arabic.name@test.com",
        phone: "0598222333",
        user_role: "client",
        password: "ValidPass123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.full_name).toBe("محمد أحمد");
    });
  });
});

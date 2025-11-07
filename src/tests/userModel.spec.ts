import { User, IUser } from "../models/User";
import pool from "../config/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";

describe("User Model", () => {
  const userModel = new User(pool);
  let testUserId: string;
  const testUserData: IUser = {
    full_name: "Test User",
    email: "testuser@example.com",
    phone: "0599123456",
    password: "TestPassword123",
    user_role: "client",
  };

  beforeAll(async () => {
    // Clear test data before running tests
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
  });

  // ============================================
  // CREATE USER TESTS
  // ============================================
  describe("create()", () => {
    it("should create a new user successfully", async () => {
      const newUser = await userModel.create(testUserData);

      expect(newUser).toBeDefined();
      expect(newUser.id).toBeDefined();
      expect(newUser.full_name).toBe(testUserData.full_name);
      expect(newUser.email).toBe(testUserData.email);
      expect(newUser.phone).toBe(testUserData.phone);
      expect(newUser.password).toBeUndefined(); // Password should not be returned

      // Store the ID for subsequent tests
      testUserId = newUser.id!;
    });

    it("should hash the password when creating a user", async () => {
      const user: IUser = {
        full_name: "Hash Test User",
        email: "hashtest@example.com",
        phone: "0599234567",
        password: "PlainPassword123",
        user_role: "client",
      };

      await userModel.create(user);

      // Query database directly to check hashed password
      const result = await pool.query("SELECT password FROM users WHERE email = $1", [user.email]);

      const storedPassword = result.rows[0].password;
      expect(storedPassword).toBeDefined();
      expect(storedPassword).not.toBe(user.password); // Should be hashed, not plain
      expect(storedPassword).toMatch(/^\$2[aby]\$/); // Should match bcrypt hash pattern
    });

    it("should create users with unique emails", async () => {
      const user1: IUser = {
        full_name: "User One",
        email: "unique1@example.com",
        phone: "0599345678",
        password: "Password123",
        user_role: "client",
      };

      const user2: IUser = {
        full_name: "User Two",
        email: "unique2@example.com",
        phone: "0599456789",
        password: "Password456",
        user_role: "client",
      };

      const created1 = await userModel.create(user1);
      const created2 = await userModel.create(user2);

      expect(created1.id).not.toBe(created2.id);
      expect(created1.email).not.toBe(created2.email);
    });

    it("should throw error when creating user with duplicate email", async () => {
      const duplicateUser: IUser = {
        full_name: "Duplicate User",
        email: testUserData.email, // Same email as first test
        phone: "0599567890",
        password: "AnotherPassword123",
        user_role: "client",
      };

      await expectAsync(userModel.create(duplicateUser)).toBeRejected();
    });

    it("should handle special characters in user data", async () => {
      const specialUser: IUser = {
        full_name: "Jean-Pierre O'Connor",
        email: "special.chars@example.com",
        phone: "0599678901",
        password: "P@ssw0rd!#$%",
        user_role: "client",
      };

      const created = await userModel.create(specialUser);

      expect(created.full_name).toBe(specialUser.full_name);
      expect(created.email).toBe(specialUser.email);
    });

    it("should handle Unicode characters in full name", async () => {
      const unicodeUser: IUser = {
        full_name: "محمد أحمد",
        email: "unicode@example.com",
        phone: "0599789012",
        password: "Password123",
        user_role: "client",
      };

      const created = await userModel.create(unicodeUser);

      expect(created.full_name).toBe(unicodeUser.full_name);
    });
  });

  // ============================================
  // GET ALL USERS TESTS
  // ============================================
  describe("getAll()", () => {
    beforeAll(async () => {
      // Ensure we have some users in the database
      await pool.query("DELETE FROM users WHERE email LIKE '%@getall.com'");

      await userModel.create({
        full_name: "GetAll User 1",
        email: "user1@getall.com",
        phone: "0598111111",
        password: "Password123",
        user_role: "client",
      });

      await userModel.create({
        full_name: "GetAll User 2",
        email: "user2@getall.com",
        phone: "0598222222",
        password: "Password123",
        user_role: "client",
      });
    });

    it("should retrieve all users from database", async () => {
      const users = await userModel.getAll();

      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it("should return users without password field", async () => {
      const users = await userModel.getAll();

      users.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.full_name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.password).toBeUndefined();
      });
    });

    it("should return users with all required fields", async () => {
      const users = await userModel.getAll();

      users.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.full_name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.phone).toBeDefined();
      });
    });

    afterAll(async () => {
      await pool.query("DELETE FROM users WHERE email LIKE '%@getall.com'");
    });
  });

  // ============================================
  // GET USER BY EMAIL TESTS
  // ============================================
  describe("getByEmail()", () => {
    it("should retrieve user by email successfully", async () => {
      const user = await userModel.getByEmail(testUserData.email);

      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user!.email).toBe(testUserData.email);
      expect(user!.full_name).toBe(testUserData.full_name);
      expect(user!.phone).toBe(testUserData.phone);
      expect(user!.id).toBeDefined();
    });

    it("should return null for non-existent email", async () => {
      const user = await userModel.getByEmail("nonexistent@example.com");

      expect(user).toBeNull();
    });

    it("should not return password field", async () => {
      const user = await userModel.getByEmail(testUserData.email);

      expect(user).toBeDefined();
      expect(user!.password).toBeUndefined();
    });

    it("should handle different case variations of email", async () => {
      // PostgreSQL email comparison is case-insensitive by default
      const user = await userModel.getByEmail(testUserData.email.toUpperCase());

      // PostgreSQL will find the user regardless of case
      expect(user).toBeDefined();
      if (user) {
        expect(user.email).toBe(testUserData.email); // Original casing is preserved
      }
    });

    it("should handle email with special characters", async () => {
      const specialEmailUser: IUser = {
        full_name: "Special Email User",
        email: "test+tag@example.com",
        phone: "0598333333",
        password: "Password123",
        user_role: "client",
      };

      await userModel.create(specialEmailUser);
      const retrieved = await userModel.getByEmail(specialEmailUser.email);

      expect(retrieved).toBeDefined();
      expect(retrieved!.email).toBe(specialEmailUser.email);
    });
  });

  // ============================================
  // UPDATE USER TESTS
  // ============================================
  describe("update()", () => {
    it("should update user information successfully", async () => {
      const updatedData: IUser = {
        full_name: "Updated Test User",
        email: testUserData.email, // Email is used to find user
        phone: "0598444444",
        password: "NewPassword123",
        user_role: "client",
      };

      const updated = await userModel.update(testUserData.email, updatedData);

      expect(updated).toBeDefined();
      expect(updated).not.toBeNull();
      expect(updated!.full_name).toBe(updatedData.full_name);
      expect(updated!.phone).toBe(updatedData.phone);
      expect(updated!.email).toBe(testUserData.email);
    });

    it("should hash new password when updating", async () => {
      const newPassword = "BrandNewPassword123";
      const updateData: IUser = {
        full_name: "Updated Test User",
        email: testUserData.email,
        phone: "0598444444",
        password: newPassword,
        user_role: "client",
      };

      await userModel.update(testUserData.email, updateData);

      // Check database for hashed password
      const result = await pool.query("SELECT password FROM users WHERE email = $1", [
        testUserData.email,
      ]);

      const storedPassword = result.rows[0].password;
      expect(storedPassword).not.toBe(newPassword);
      expect(storedPassword).toMatch(/^\$2[aby]\$/);
    });

    it("should return null when updating non-existent user", async () => {
      const updateData: IUser = {
        full_name: "Non Existent",
        email: "nonexistent@example.com",
        phone: "0598555555",
        password: "Password123",
        user_role: "client",
      };

      const result = await userModel.update("nonexistent@example.com", updateData);

      expect(result).toBeNull();
    });

    it("should not return password in update response", async () => {
      const updateData: IUser = {
        full_name: "No Password Return",
        email: testUserData.email,
        phone: "0598666666",
        password: "SecretPassword123",
        user_role: "client",
      };

      const updated = await userModel.update(testUserData.email, updateData);

      expect(updated).toBeDefined();
      expect(updated!.password).toBeUndefined();
    });

    it("should preserve email when updating other fields", async () => {
      const originalEmail = testUserData.email;
      const updateData: IUser = {
        full_name: "New Name",
        email: originalEmail,
        phone: "0598777777",
        password: "Password123",
        user_role: "client",
      };

      const updated = await userModel.update(originalEmail, updateData);

      expect(updated!.email).toBe(originalEmail);
    });

    it("should update with Unicode characters", async () => {
      const updateData: IUser = {
        full_name: "عبدالرحمن جابر",
        email: testUserData.email,
        phone: "0598888888",
        password: "Password123",
        user_role: "client",
      };

      const updated = await userModel.update(testUserData.email, updateData);

      expect(updated!.full_name).toBe(updateData.full_name);
    });
  });

  // ============================================
  // DELETE USER TESTS
  // ============================================
  describe("delete()", () => {
    it("should delete user successfully", async () => {
      const userToDelete: IUser = {
        full_name: "Delete Test User",
        email: "delete@example.com",
        phone: "0598999999",
        password: "Password123",
        user_role: "client",
      };

      await userModel.create(userToDelete);
      const result = await userModel.delete(userToDelete.email);

      expect(result).toBe(true);

      // Verify user is deleted
      const deletedUser = await userModel.getByEmail(userToDelete.email);
      expect(deletedUser).toBeNull();
    });

    it("should return false when deleting non-existent user", async () => {
      const result = await userModel.delete("nonexistent@example.com");

      expect(result).toBe(false);
    });

    it("should not affect other users when deleting one user", async () => {
      const user1: IUser = {
        full_name: "Keep User 1",
        email: "keep1@example.com",
        phone: "0597111111",
        password: "Password123",
        user_role: "client",
      };

      const user2: IUser = {
        full_name: "Keep User 2",
        email: "keep2@example.com",
        phone: "0597222222",
        password: "Password123",
        user_role: "client",
      };

      await userModel.create(user1);
      await userModel.create(user2);

      await userModel.delete(user1.email);

      const remainingUser = await userModel.getByEmail(user2.email);
      expect(remainingUser).toBeDefined();
      expect(remainingUser!.email).toBe(user2.email);

      // Cleanup
      await userModel.delete(user2.email);
    });

    it("should handle different case variations when deleting", async () => {
      const userToDelete: IUser = {
        full_name: "Case Sensitive Delete",
        email: "casedelete@example.com",
        phone: "0597333333",
        password: "Password123",
        user_role: "client",
      };

      await userModel.create(userToDelete);

      // PostgreSQL email comparison is case-insensitive
      const result = await userModel.delete(userToDelete.email.toUpperCase());

      expect(result).toBe(true); // Should delete successfully with uppercase email

      // Verify user is deleted
      const user = await userModel.getByEmail(userToDelete.email);
      expect(user).toBeNull();
    });
  });

  // ============================================
  // AUTHENTICATE USER TESTS
  // ============================================
  describe("authenticate()", () => {
    const authTestUser: IUser = {
      full_name: "Auth Test User",
      email: "authtest@example.com",
      phone: "0597444444",
      password: "AuthPassword123",
      user_role: "client",
    };

    beforeAll(async () => {
      await userModel.create(authTestUser);
    });

    it("should authenticate user with correct credentials", async () => {
      const authenticated = await userModel.authenticate(
        authTestUser.email,
        authTestUser.password!,
        authTestUser.user_role,
      );

      expect(authenticated).toBeDefined();
      expect(authenticated).not.toBeNull();
      expect(authenticated!.email).toBe(authTestUser.email);
      expect(authenticated!.full_name).toBe(authTestUser.full_name);
    });

    it("should return null for incorrect password", async () => {
      const authenticated = await userModel.authenticate(
        authTestUser.email,
        "WrongPassword123",
        authTestUser.user_role,
      );

      expect(authenticated).toBeNull();
    });

    it("should return null for non-existent email", async () => {
      const authenticated = await userModel.authenticate(
        "nonexistent@example.com",
        "SomePassword123",
        "client",
      );

      expect(authenticated).toBeNull();
    });

    it("should be case-sensitive for password", async () => {
      const authenticated = await userModel.authenticate(
        authTestUser.email,
        authTestUser.password!.toLowerCase(),
        authTestUser.user_role,
      );

      expect(authenticated).toBeNull();
    });

    it("should handle different case variations for email", async () => {
      // PostgreSQL email comparison is case-insensitive
      const authenticated = await userModel.authenticate(
        authTestUser.email.toUpperCase(),
        authTestUser.password!,
        authTestUser.user_role,
      );

      // Should authenticate successfully regardless of email case
      expect(authenticated).not.toBeNull();
      if (authenticated) {
        expect(authenticated.email).toBe(authTestUser.email); // Original casing is preserved
      }
    });

    it("should return null for empty password", async () => {
      const authenticated = await userModel.authenticate(
        authTestUser.email,
        "",
        authTestUser.user_role,
      );

      expect(authenticated).toBeNull();
    });

    it("should return null for empty email", async () => {
      const authenticated = await userModel.authenticate(
        "",
        authTestUser.password!,
        authTestUser.user_role,
      );

      expect(authenticated).toBeNull();
    });

    it("should authenticate with password containing special characters", async () => {
      const specialPassUser: IUser = {
        full_name: "Special Pass Auth User",
        email: "specialauth@example.com",
        phone: "0597555555",
        password: "P@ssw0rd!#$%^&*()",
        user_role: "client",
      };

      await userModel.create(specialPassUser);
      const authenticated = await userModel.authenticate(
        specialPassUser.email,
        specialPassUser.password!,
        specialPassUser.user_role,
      );

      expect(authenticated).toBeDefined();
      expect(authenticated!.email).toBe(specialPassUser.email);
    });

    afterAll(async () => {
      await pool.query("DELETE FROM users WHERE email LIKE '%auth%@example.com'");
    });
  });

  // ============================================
  // PASSWORD RESET TOKEN TESTS
  // ============================================
  describe("createPasswordResettoken()", () => {
    const resetTestUser: IUser = {
      full_name: "Reset Test User",
      email: "resettest@example.com",
      phone: "0597666666",
      password: "ResetPassword123",
      user_role: "client",
    };

    beforeAll(async () => {
      await userModel.create(resetTestUser);
    });

    it("should create password reset token successfully", async () => {
      const token = await userModel.createPasswordResettoken(resetTestUser.email);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should store hashed token in database", async () => {
      const token = await userModel.createPasswordResettoken(resetTestUser.email);

      const result = await pool.query(
        'SELECT "password_reset_token", "password_reset_expires" FROM users WHERE email = $1',
        [resetTestUser.email],
      );

      const storedToken = result.rows[0].password_reset_token;
      expect(storedToken).toBeDefined();
      expect(storedToken).not.toBe(token); // Should be hashed, not plain token
      expect(storedToken.length).toBe(64); // SHA256 hash length in hex
    });

    it("should set expiration time for reset token", async () => {
      await userModel.createPasswordResettoken(resetTestUser.email);

      const result = await pool.query(
        'SELECT "password_reset_expires" FROM users WHERE email = $1',
        [resetTestUser.email],
      );

      const expiresAt = new Date(result.rows[0].password_reset_expires);
      const now = new Date();

      expect(expiresAt).toBeDefined();
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresAt.getTime()).toBeLessThan(now.getTime() + 16 * 60 * 1000); // Less than 16 minutes
    });

    it("should generate different tokens for multiple requests", async () => {
      const token1 = await userModel.createPasswordResettoken(resetTestUser.email);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const token2 = await userModel.createPasswordResettoken(resetTestUser.email);

      expect(token1).not.toBe(token2);
    });

    it("should generate token of appropriate length", async () => {
      const token = await userModel.createPasswordResettoken(resetTestUser.email);

      // Token should be 32 bytes = 64 hex characters
      expect(token.length).toBe(64);
    });

    it("should override previous reset token", async () => {
      const token1 = await userModel.createPasswordResettoken(resetTestUser.email);
      const token2 = await userModel.createPasswordResettoken(resetTestUser.email);

      const result = await pool.query('SELECT "password_reset_token" FROM users WHERE email = $1', [
        resetTestUser.email,
      ]);

      const storedHashedToken = result.rows[0].password_reset_token;

      // Verify that the stored token is the hash of token2, not token1
      const hash2 = crypto.createHash("sha256").update(token2).digest("hex");

      expect(storedHashedToken).toBe(hash2);
    });

    afterAll(async () => {
      await pool.query("DELETE FROM users WHERE email = $1", [resetTestUser.email]);
    });
  });

  // ============================================
  // EDGE CASES AND SECURITY TESTS
  // ============================================
  describe("Security and Edge Cases", () => {
    it("should handle SQL injection attempts in email", async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      const user = await userModel.getByEmail(maliciousEmail);

      expect(user).toBeNull();

      // Verify table still exists
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')",
      );
      expect(tableCheck.rows[0].exists).toBe(true);
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(50) + "@example.com";
      const user: IUser = {
        full_name: "Long Email User",
        email: longEmail,
        phone: "0597777777",
        password: "Password123",
        user_role: "client",
      };

      const created = await userModel.create(user);
      expect(created.email).toBe(longEmail);

      // Cleanup
      await userModel.delete(longEmail);
    });

    it("should handle very long names within database limits", async () => {
      // Database has VARCHAR(120) limit, so test with 100 characters
      const longName = "A".repeat(100);
      const user: IUser = {
        full_name: longName,
        email: "longname@example.com",
        phone: "0597888888",
        password: "Password123",
        user_role: "client",
      };

      const created = await userModel.create(user);
      expect(created.full_name).toBe(longName);

      // Cleanup
      await userModel.delete(user.email);
    });

    it("should properly hash passwords with pepper", async () => {
      const password = "TestPassword123";
      const user: IUser = {
        full_name: "Pepper Test User",
        email: "peppertest@example.com",
        phone: "0597999999",
        password: password,
        user_role: "client",
      };

      await userModel.create(user);

      // Direct bcrypt comparison without pepper should fail
      const result = await pool.query("SELECT password FROM users WHERE email = $1", [user.email]);

      const storedHash = result.rows[0].password;
      const directCompare = await bcrypt.compare(password, storedHash);

      expect(directCompare).toBe(false); // Should fail without pepper

      // But authenticate should work (it uses pepper)
      const authenticated = await userModel.authenticate(user.email, password, user.user_role);
      expect(authenticated).not.toBeNull();
      expect(authenticated!.email).toBe(user.email);

      // Cleanup
      await userModel.delete(user.email);
    });

    it("should handle concurrent user creation", async () => {
      const users = [
        {
          full_name: "Concurrent User 1",
          email: "concurrent1@example.com",
          phone: "0596111111",
          password: "Password123",
          user_role: "client",
        },
        {
          full_name: "Concurrent User 2",
          email: "concurrent2@example.com",
          phone: "0596222222",
          password: "Password123",
          user_role: "client",
        },
        {
          full_name: "Concurrent User 3",
          email: "concurrent3@example.com",
          phone: "0596333333",
          password: "Password123",
          user_role: "client",
        },
      ];

      const createdUsers = await Promise.all(users.map((user) => userModel.create(user)));

      expect(createdUsers.length).toBe(3);
      for (let i = 0; i < createdUsers.length; i++) {
        const createdUser = createdUsers[i];
        const originalUser = users[i];
        expect(createdUser).toBeDefined();
        if (createdUser && originalUser) {
          expect(createdUser.email).toBe(originalUser.email);
        }
      }

      // Cleanup
      await Promise.all(users.map((user) => userModel.delete(user.email)));
    });
  });
});

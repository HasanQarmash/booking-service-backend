import pool from "./database";

beforeAll(async () => {
  const res = await pool.query("SELECT 1 AS connected");
  expect(res.rows[0].connected).toBe(1);
});

describe("PostgreSQL Database Connection", () => {
  it("should connect successfully", async () => {
    const res = await pool.query("SELECT 1 AS ok");
    expect(res.rows[0].ok).toBe(1);
  });
});

describe("Checking the users table", () => {
  it("should verify that table 'users' exists", async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists;
    `);
    expect(result.rows[0].exists).toBeTrue();
  });

  it("should verify that all expected columns exist in 'users' table", async () => {
    const columns = [
      "id",
      "full_name",
      "email",
      "phone",
      "birthday",
      "password",
      "password_reset_token",
      "password_reset_expires",
      "is_email_verified",
      "status",
      "created_at",
      "updated_at",
    ];

    const result = await pool.query(
      `
      SELECT COUNT(*) AS col_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = ANY($1)
      `,
      [columns],
    );

    expect(Number(result.rows[0].col_count)).toBe(columns.length);
  });
});

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseName = process.env.DB_NAME;

const pool = new Pool({
  host: process.env.DB_HOST!,
  port: +process.env.DB_PORT!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ PostgreSQL connected successfully to ${databaseName}`);
    client.release();
  } catch (err) {
    console.error(`❌ Database connection failed to ${databaseName}:`, err);
    process.exit(1);
  }
};

export default pool;

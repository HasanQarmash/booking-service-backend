"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function (db) {
  // Ensure required Postgres extensions
  await db.runSql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  await db.runSql(`CREATE EXTENSION IF NOT EXISTS "citext";`);

  // Create enum types if not exist
  await db.runSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending','active','disabled');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('administrator', 'customeradmin', 'client');
      END IF;
    END$$;
  `);

  // Create users table
  await db.runSql(`
    CREATE TABLE IF NOT EXISTS users (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name             VARCHAR(120) NOT NULL,
      email                 CITEXT NOT NULL UNIQUE,
      phone                 VARCHAR(32),
      birthday              DATE,
      password              VARCHAR(255),
      password_reset_token  VARCHAR(255),
      password_reset_expires timestamptz,
      is_email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
      status                user_status NOT NULL DEFAULT 'pending',
      user_role             user_role_enum NOT NULL DEFAULT 'client',
      domain                VARCHAR(120),
      customer_admin_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at            timestamptz NOT NULL DEFAULT now(),
      updated_at            timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT unique_domain_for_customer_admin UNIQUE (domain)
    );
  `);
};

exports.down = async function (db) {
  await db.runSql(`
    DROP TABLE IF EXISTS users CASCADE;
    DROP TYPE IF EXISTS user_status CASCADE;
    DROP TYPE IF EXISTS user_role_enum CASCADE;
  `);
};

exports._meta = {
  version: 1,
};


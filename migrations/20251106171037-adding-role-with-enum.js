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
  // ensure enum type exists
  await db.runSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('administrator', 'customeradmin', 'client');
      END IF;
    END$$;
  `);

  // add new column to users table
  await db.runSql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_role user_role_enum NOT NULL DEFAULT 'client';
  `);
};

exports.down = async function (db) {
  await db.runSql(`
    ALTER TABLE users DROP COLUMN IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS user_role_enum CASCADE;
  `);
};

exports._meta = {
  version: 1,
};


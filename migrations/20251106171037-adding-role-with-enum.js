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
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('administrator', 'customeradmin', 'client');
      END IF;
    END$$;
  `);

  // add new column to users table
  await db.runSql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'client';
  `);
};

exports.down = async function (db) {
  await db.runSql(`ALTER TABLE users DROP COLUMN IF EXISTS role;`);
  await db.runSql(`DROP TYPE IF EXISTS user_role;`);
};

exports._meta = {
  version: 1,
};


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
  // Remove existing global unique constraint on email if it exists
  await db.runSql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
      END IF;
    END$$;
  `);

  // Create partial unique index for clients (email + customer_admin_id)
  await db.runSql(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_client_email_per_admin
    ON users (email, customer_admin_id)
    WHERE user_role = 'client';
  `);

  // Create partial unique index for customer admins (email + domain)
  await db.runSql(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_admin_email_per_domain
    ON users (email, domain)
    WHERE user_role = 'customeradmin';
  `);
};

exports.down = async function (db) {
  await db.runSql(`
    DROP INDEX IF EXISTS unique_client_email_per_admin;
    DROP INDEX IF EXISTS unique_admin_email_per_domain;
  `);
};

exports._meta = {
  version: 1,
};


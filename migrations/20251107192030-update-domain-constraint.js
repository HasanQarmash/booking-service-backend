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
  // Drop the old constraint (if it exists)
  await db.runSql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_domain_for_customer_admin;
  `);

  // Create new partial unique index (applies only to customer admins)
  await db.runSql(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_domain_for_customer_admin
    ON users (domain)
    WHERE user_role = 'customeradmin';
  `);
};

exports.down = async function (db) {
  // Drop the partial index
  await db.runSql(`
    DROP INDEX IF EXISTS unique_domain_for_customer_admin;
  `);

  // Restore the old full unique constraint (if needed)
  await db.runSql(`
    ALTER TABLE users
    ADD CONSTRAINT unique_domain_for_customer_admin UNIQUE (domain);
  `);
};

exports._meta = {
  version: 1,
};


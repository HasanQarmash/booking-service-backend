/**
 * Migration to add Google OAuth fields to users table
 * Adds: google_id, auth_provider, profile_picture
 * Makes password nullable for OAuth users
 */

exports.up = function (db) {
  return db.runSql(`
    -- Add google_id column (unique identifier from Google)
    ALTER TABLE users 
    ADD COLUMN google_id VARCHAR(255) UNIQUE;

    -- Add auth_provider column (tracks authentication method: 'local' or 'google')
    ALTER TABLE users 
    ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';

    -- Add profile_picture column (stores Google profile picture URL)
    ALTER TABLE users 
    ADD COLUMN profile_picture TEXT;

    -- Make password nullable (OAuth users don't need password)
    ALTER TABLE users 
    ALTER COLUMN password DROP NOT NULL;

    -- Create indexes for better query performance
    CREATE INDEX idx_users_google_id ON users(google_id);
    CREATE INDEX idx_users_auth_provider ON users(auth_provider);
  `);
};

exports.down = function (db) {
  return db.runSql(`
    -- Remove indexes
    DROP INDEX IF EXISTS idx_users_google_id;
    DROP INDEX IF EXISTS idx_users_auth_provider;

    -- Remove columns
    ALTER TABLE users DROP COLUMN IF EXISTS google_id;
    ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
    ALTER TABLE users DROP COLUMN IF EXISTS profile_picture;

    -- Make password required again
    ALTER TABLE users 
    ALTER COLUMN password SET NOT NULL;
  `);
};

exports._meta = {
  version: 1,
};

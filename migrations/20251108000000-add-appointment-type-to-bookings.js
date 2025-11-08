'use strict';

module.exports = {
  up: async (db) => {
    return db.runSql(`
      ALTER TABLE bookings 
      ADD COLUMN appointment_type VARCHAR(20) DEFAULT 'consultation' 
      CHECK (appointment_type IN ('consultation', 'treatment', 'emergency'));
      
      COMMENT ON COLUMN bookings.appointment_type IS 'Type of appointment: consultation, treatment, or emergency';
    `);
  },

  down: async (db) => {
    return db.runSql(`
      ALTER TABLE bookings DROP COLUMN IF EXISTS appointment_type;
    `);
  }
};

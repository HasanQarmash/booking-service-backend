/**
 * Migration: Create bookings table
 * This table stores all booking appointments with relationships to users
 */

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
  await db.runSql(`
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Customer/Patient information
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_name VARCHAR(255) NOT NULL,
      patient_contact VARCHAR(255) NOT NULL,
      
      -- Provider/Admin information
      provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
      
      -- Appointment details
      title VARCHAR(255) NOT NULL,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      
      -- Status and metadata
      status booking_status DEFAULT 'pending',
      cancellation_reason TEXT,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      -- Constraints
      CONSTRAINT valid_time_range CHECK (end_time > start_time),
      CONSTRAINT valid_appointment_date CHECK (appointment_date >= CURRENT_DATE)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(appointment_date, start_time);

    -- Create composite index for checking slot availability
    CREATE INDEX IF NOT EXISTS idx_bookings_availability 
      ON bookings(provider_id, appointment_date, start_time, end_time)
      WHERE status NOT IN ('cancelled', 'no_show');
  `);
};

exports.down = async function (db) {
  await db.runSql(`
    DROP TABLE IF EXISTS bookings CASCADE;
    DROP TYPE IF EXISTS booking_status CASCADE;
  `);
};

exports._meta = {
  version: 1,
};


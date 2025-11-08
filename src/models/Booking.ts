import { Pool } from "pg";
import pool from "../config/database";

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentType = 'consultation' | 'treatment' | 'emergency';

export interface IBooking {
  id?: string;
  customer_id: string;
  patient_name: string;
  patient_contact: string;
  provider_id?: string | null;
  title: string;
  appointment_type?: AppointmentType;
  appointment_date: string | Date;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status?: BookingStatus;
  cancellation_reason?: string;
  cancelled_at?: Date;
  cancelled_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class Booking {
  constructor(public pool: Pool) { }

  /**
   * Create a new booking
   */
  async create(booking: IBooking): Promise<IBooking> {
    const result = await this.pool.query(
      `INSERT INTO bookings (
        customer_id,
        patient_name,
        patient_contact,
        provider_id,
        title,
        appointment_type,
        appointment_date,
        start_time,
        end_time,
        duration_minutes,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        booking.customer_id,
        booking.patient_name,
        booking.patient_contact,
        booking.provider_id || null,
        booking.title,
        booking.appointment_type || 'consultation',
        booking.appointment_date,
        booking.start_time,
        booking.end_time,
        booking.duration_minutes,
        booking.status || 'pending'
      ]
    );
    return result.rows[0];
  }

  /**
   * Get all bookings with optional filters
   */
  async getAll(filters?: {
    customer_id?: string;
    provider_id?: string;
    status?: BookingStatus;
    date_from?: string;
    date_to?: string;
  }): Promise<IBooking[]> {
    let query = `
      SELECT 
        b.*,
        c.full_name as customer_name,
        c.email as customer_email,
        p.full_name as provider_name
      FROM bookings b
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN users p ON b.provider_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.customer_id) {
      query += ` AND b.customer_id = $${paramIndex++}`;
      params.push(filters.customer_id);
    }

    if (filters?.provider_id) {
      query += ` AND b.provider_id = $${paramIndex++}`;
      params.push(filters.provider_id);
    }

    if (filters?.status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.date_from) {
      query += ` AND b.appointment_date >= $${paramIndex++}`;
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      query += ` AND b.appointment_date <= $${paramIndex++}`;
      params.push(filters.date_to);
    }

    query += ` ORDER BY b.appointment_date, b.start_time`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get booking by ID with related data
   */
  async getById(id: string): Promise<IBooking | null> {
    const result = await this.pool.query(
      `SELECT 
        b.*,
        c.full_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        p.full_name as provider_name
      FROM bookings b
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN users p ON b.provider_id = p.id
      WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
    userId?: string,
    reason?: string
  ): Promise<IBooking | null> {
    let query = `
      UPDATE bookings
      SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP
    `;

    const params: any[] = [status, id];
    let paramIndex = 3;

    if (status === 'cancelled') {
      query += `,
        cancelled_at = CURRENT_TIMESTAMP,
        cancelled_by = $${paramIndex++},
        cancellation_reason = $${paramIndex++}
      `;
      params.splice(2, 0, userId || null, reason || null);
    }

    query += ` WHERE id = $2 RETURNING *`;

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Update booking details
   */
  async update(id: string, booking: Partial<IBooking>): Promise<IBooking | null> {
    const result = await this.pool.query(
      `UPDATE bookings
      SET 
        patient_name = COALESCE($1, patient_name),
        patient_contact = COALESCE($2, patient_contact),
        provider_id = COALESCE($3, provider_id),
        title = COALESCE($4, title),
        appointment_type = COALESCE($5, appointment_type),
        appointment_date = COALESCE($6, appointment_date),
        start_time = COALESCE($7, start_time),
        end_time = COALESCE($8, end_time),
        duration_minutes = COALESCE($9, duration_minutes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        booking.patient_name || null,
        booking.patient_contact || null,
        booking.provider_id !== undefined ? booking.provider_id : null,
        booking.title || null,
        booking.appointment_type || null,
        booking.appointment_date || null,
        booking.start_time || null,
        booking.end_time || null,
        booking.duration_minutes || null,
        id
      ]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a booking (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM bookings WHERE id = $1`,
      [id]
    );
    return result.rowCount! > 0;
  }

  /**
   * Check if a time slot is available
   */
  async isSlotAvailable(
    provider_id: string | null,
    appointment_date: string,
    start_time: string,
    end_time: string,
    exclude_booking_id?: string
  ): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM bookings
      WHERE provider_id = $1
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time < $4 AND end_time > $3)
          OR (start_time >= $3 AND start_time < $4)
          OR (end_time > $3 AND end_time <= $4)
        )
    `;

    const params: any[] = [provider_id, appointment_date, start_time, end_time];

    if (exclude_booking_id) {
      query += ` AND id != $5`;
      params.push(exclude_booking_id);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Get available time slots for a specific date and provider
   */
  async getAvailableSlots(
    provider_id: string | null,
    appointment_date: string,
    duration_minutes: number = 30,
    working_hours_start: string = '08:00',
    working_hours_end: string = '18:00'
  ): Promise<string[]> {
    // Get all booked slots for the date
    const bookedSlots = await this.pool.query(
      `SELECT start_time, end_time
       FROM bookings
       WHERE provider_id = $1
         AND appointment_date = $2
         AND status NOT IN ('cancelled', 'no_show')
       ORDER BY start_time`,
      [provider_id, appointment_date]
    );

    // Generate all possible time slots
    const availableSlots: string[] = [];
    const [startHour = 8, startMin = 0] = working_hours_start.split(':').map(Number);
    const [endHour = 18, endMin = 0] = working_hours_end.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + duration_minutes <= endTime) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Check if this slot overlaps with any booked slot
      const isBooked = bookedSlots.rows.some((booking: any) => {
        const [bookingStartH, bookingStartM] = booking.start_time.split(':').map(Number);
        const [bookingEndH, bookingEndM] = booking.end_time.split(':').map(Number);
        const bookingStart = bookingStartH * 60 + bookingStartM;
        const bookingEnd = bookingEndH * 60 + bookingEndM;

        return currentTime < bookingEnd && currentTime + duration_minutes > bookingStart;
      });

      if (!isBooked) {
        availableSlots.push(timeSlot);
      }

      currentTime += duration_minutes;
    }

    return availableSlots;
  }
}

export default new Booking(pool);

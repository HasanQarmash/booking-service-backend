import express from 'express';
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  getAvailableSlots
} from '../controllers/bookingController';
import { authenticate as protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protected routes - require authentication
router.use(protect);

// Get available time slots (no booking required, just check availability)
router.get('/available-slots', getAvailableSlots);

// Get all bookings for authenticated user
router.get('/my-bookings', getMyBookings);

// Create a new booking
router.post('/', createBooking);

// Get all bookings (with optional filters)
router.get('/', getAllBookings);

// Get specific booking by ID
router.get('/:id', getBookingById);

// Update booking
router.patch('/:id', updateBooking);

// Update booking status
router.patch('/:id/status', updateBookingStatus);

// Delete booking
router.delete('/:id', deleteBooking);

export default router;

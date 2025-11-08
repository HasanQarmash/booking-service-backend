import { Request, Response, NextFunction } from 'express';
import bookingModel from '../models/Booking';
import { AppError } from '../utils/errors';

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      patient_name,
      patient_contact,
      provider_id,
      title,
      appointment_type,
      appointment_date,
      start_time,
      end_time,
      duration_minutes
    } = req.body;

    // Get customer ID from authenticated user
    const customer_id = (req.user as any)?.id;

    if (!customer_id) {
      return next(new AppError('User not authenticated', 401));
    }

    // Validate required fields
    if (!patient_name || !patient_contact || !title || !appointment_date || !start_time || !end_time) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate appointment_type if provided
    if (appointment_type && !['consultation', 'treatment', 'emergency'].includes(appointment_type)) {
      return next(new AppError('Invalid appointment type. Must be consultation, treatment, or emergency', 400));
    }

    // Check if slot is available
    const isAvailable = await bookingModel.isSlotAvailable(
      provider_id || null,
      appointment_date,
      start_time,
      end_time
    );

    if (!isAvailable) {
      return next(new AppError('This time slot is not available', 409));
    }

    const booking = await bookingModel.create({
      customer_id,
      patient_name,
      patient_contact,
      provider_id: provider_id || null,
      title,
      appointment_type: appointment_type || 'consultation',
      appointment_date,
      start_time,
      end_time,
      duration_minutes: duration_minutes || 30
    });

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customer_id, provider_id, status, date_from, date_to } = req.query;

    const filters: any = {};
    if (customer_id) filters.customer_id = customer_id as string;
    if (provider_id) filters.provider_id = provider_id as string;
    if (status) filters.status = status as string;
    if (date_from) filters.date_from = date_from as string;
    if (date_to) filters.date_to = date_to as string;

    const bookings = await bookingModel.getAll(filters);

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Booking ID is required', 400));
    }

    const booking = await bookingModel.getById(id);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer_id = (req.user as any)?.id;

    if (!customer_id) {
      return next(new AppError('User not authenticated', 401));
    }

    const bookings = await bookingModel.getAll({ customer_id });

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return next(new AppError('Booking ID is required', 400));
    }

    // Validate appointment_type if provided
    if (updateData.appointment_type && !['consultation', 'treatment', 'emergency'].includes(updateData.appointment_type)) {
      return next(new AppError('Invalid appointment type. Must be consultation, treatment, or emergency', 400));
    }

    // If updating time slot, check availability
    if (updateData.appointment_date || updateData.start_time || updateData.end_time) {
      const existingBooking = await bookingModel.getById(id);
      if (!existingBooking) {
        return next(new AppError('Booking not found', 404));
      }

      const isAvailable = await bookingModel.isSlotAvailable(
        updateData.provider_id || existingBooking.provider_id || null,
        updateData.appointment_date || existingBooking.appointment_date,
        updateData.start_time || existingBooking.start_time,
        updateData.end_time || existingBooking.end_time,
        id
      );

      if (!isAvailable) {
        return next(new AppError('This time slot is not available', 409));
      }
    }

    const booking = await bookingModel.update(id, updateData);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking updated successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = (req.user as any)?.id;

    if (!id) {
      return next(new AppError('Booking ID is required', 400));
    }

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    const booking = await bookingModel.updateStatus(id, status, userId, reason);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking status updated successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Booking ID is required', 400));
    }

    const deleted = await bookingModel.delete(id);

    if (!deleted) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(204).json({
      status: 'success',
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { provider_id, appointment_date, duration_minutes, working_hours_start, working_hours_end } = req.query;

    if (!appointment_date) {
      return next(new AppError('appointment_date is required', 400));
    }

    const slots = await bookingModel.getAvailableSlots(
      provider_id as string || null,
      appointment_date as string,
      duration_minutes ? parseInt(duration_minutes as string) : 30,
      working_hours_start as string || '08:00',
      working_hours_end as string || '18:00'
    );

    res.status(200).json({
      status: 'success',
      data: {
        available_slots: slots,
        count: slots.length
      }
    });
  } catch (error) {
    next(error);
  }
};

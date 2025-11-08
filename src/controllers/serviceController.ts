import { Request, Response, NextFunction } from 'express';
import serviceModel from '../models/Service';
import { AppError } from '../utils/errors';

export const getAllServices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const services = await serviceModel.getAll();

    res.status(200).json({
      status: 'success',
      results: services.length,
      data: { services }
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Service ID is required', 400));
    }

    const service = await serviceModel.getById(id);

    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { service }
    });
  } catch (error) {
    next(error);
  }
};

export const createService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceData = req.body;

    if (!serviceData.name || !serviceData.duration_minutes) {
      return next(new AppError('Name and duration are required', 400));
    }

    const service = await serviceModel.create(serviceData);

    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return next(new AppError('Service ID is required', 400));
    }

    const service = await serviceModel.update(id, updateData);

    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: { service }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Service ID is required', 400));
    }

    const deleted = await serviceModel.delete(id);

    if (!deleted) {
      return next(new AppError('Service not found', 404));
    }

    res.status(204).json({
      status: 'success',
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

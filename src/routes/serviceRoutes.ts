import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/serviceController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes - anyone can view services
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Protected routes - require authentication for modifications
router.post('/', authenticate, createService);
router.patch('/:id', authenticate, updateService);
router.delete('/:id', authenticate, deleteService);

export default router;

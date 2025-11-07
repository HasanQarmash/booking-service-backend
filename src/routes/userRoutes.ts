import { Router } from "express";
import { UserController } from "../controllers/userController";
import { validateUserInput } from "../middlewares/validateUser";
import { authenticate } from "../middlewares/authMiddleware";
import { User } from "../models/User";
import pool from "../config/database";
import { authRateLimit } from "../config/rateLimits";
import { validateUpdateUserInput } from "../middlewares/validateUpdateUserInput";

const router = Router();
const controller = new UserController(new User(pool));

router.get("/", authenticate, controller.getAll.bind(controller));
router.get("/:email", authenticate, controller.getByEmail.bind(controller));
router.put("/:email", authenticate, validateUpdateUserInput, controller.update.bind(controller));
router.delete("/:email", authenticate, controller.delete.bind(controller));

export default router;

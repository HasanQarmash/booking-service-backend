import { Request, Response } from "express";
import { User } from "../models/User";
import { generateToken } from "../helpers/jwt";
import { ValidationError } from "../utils/validators";
import { asyncHandler } from "../middlewares/errorHandler";
import { DuplicateEmailError, NotFoundError } from "../utils/errors";

type EmailParams = { email?: string };

export class UserController {
  constructor(private userModel: User) {}

  // GET /api/users
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.userModel.getAll();
    res.json(users);
  });

  // GET /api/users/:email
  getByEmail = asyncHandler(async (req: Request, res: Response) => {
    const email = req.params.email!;
    const user = await this.userModel.getByEmail(email);

    if (!user) throw new NotFoundError("User not found");

    res.json(user);
  });

  // PUT /api/users/:email
  update = asyncHandler(async (req: Request<EmailParams>, res: Response) => {
    const email = req.params.email!;
    const updated = await this.userModel.update(email, req.body);

    if (!updated) throw new NotFoundError("User not found");

    res.json(updated);
  });

  // DELETE /api/users/:email
  delete = asyncHandler(async (req: Request<EmailParams>, res: Response) => {
    const email = req.params.email!;
    const deleted = await this.userModel.delete(email);

    if (!deleted) throw new NotFoundError("User not found");

    res.json({ message: "User deleted" });
  });
}

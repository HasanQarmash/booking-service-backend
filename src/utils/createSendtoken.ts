import { Response } from "express";
import { generateToken } from "../helpers/jwt";
import { IUser } from "../models/User"; 

export const createSendToken = (
  user: IUser,
  statusCode: number,
  res: Response,
  message: string = "Operation successful"
) => {
  const token = generateToken({
    id: user.id!,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
  });

  // Optional cookie setup
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return res.status(statusCode).json({
    status: "success",
    message,
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
    },
  });
};


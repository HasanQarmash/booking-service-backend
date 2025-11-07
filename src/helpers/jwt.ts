import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export const generateToken = <T extends object>(entity: T) => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "1h") as `${number}${"d" | "h" | "m" | "s"}`;
  const options: SignOptions = { expiresIn };

  const token = jwt.sign(entity, JWT_SECRET, options);
  return token;
};

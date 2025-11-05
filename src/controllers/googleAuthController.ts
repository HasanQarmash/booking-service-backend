import { Request, Response, NextFunction } from "express";
import { generateToken } from "../helpers/jwt";

export const googleAuthCallback = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/customer/login?error=auth_failed`);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    });

    // Encode user data to pass to frontend
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      profile_picture: user.profile_picture,
    }));

    // Redirect to frontend with token and user data
    // The frontend will store the token and redirect to the appropriate dashboard
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    res.redirect(`${frontendUrl}/auth/google/callback?token=${token}&user=${userData}`);
  } catch (error) {
    console.error("Google auth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    res.redirect(`${frontendUrl}/customer/login?error=auth_failed`);
  }
};

export const googleAuthSuccess = (req: Request, res: Response) => {
  const user = req.user as any;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Not authenticated",
    });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
  });

  res.status(200).json({
    status: "success",
    message: "Google authentication successful",
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        profile_picture: user.profile_picture,
      },
      token,
    },
  });
};

export const googleAuthFailure = (_req: Request, res: Response) => {
  res.status(401).json({
    status: "fail",
    message: "Google authentication failed",
  });
};

export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        status: "error",
        message: "Error logging out",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  });
};

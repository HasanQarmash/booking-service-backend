import { Router } from "express";
import passport from "../config/passport";
import {
  googleAuthCallback,
  googleAuthSuccess,
  googleAuthFailure,
  logout,
} from "../controllers/googleAuthController";

const router = Router();

// Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/failure",
    session: true,
  }),
  googleAuthCallback
);

// Success route (for API access)
router.get("/google/success", googleAuthSuccess);

// Failure route
router.get("/google/failure", googleAuthFailure);

// Logout route
router.post("/logout", logout);

export default router;

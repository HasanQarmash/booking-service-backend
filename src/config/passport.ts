import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import pool from "./database";
import { getEnv } from "./env";

const userModel = new User(pool);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error, false);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: getEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
      callbackURL: getEnv("GOOGLE_CALLBACK_URL"),
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findByGoogleId(profile.id);

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findByEmail(email);

          if (user) {
            // Link Google account to existing user
            const profilePic = profile.photos?.[0]?.value;
            user = await User.linkGoogleAccount(String(user.id), profile.id, profilePic);
            return done(null, user);
          }
        }

        // Create new user with Google account
        const profilePictureUrl = profile.photos?.[0]?.value;
        const newUserData: any = {
          googleId: profile.id,
          email: email || "",
          full_name: profile.displayName,
        };
        if (profilePictureUrl) {
          newUserData.profilePicture = profilePictureUrl;
        }
        user = await User.createGoogleUser(newUserData);

        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);

export default passport;

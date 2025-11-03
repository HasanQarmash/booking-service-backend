# 🚨 GitHub Desktop Fetch Problem - Solution Guide

## What Happened?

When you clicked **"Fetch"** in GitHub Desktop, it downloaded changes from the remote repository (GitHub) that **overwrote your local changes**. This is because:

1. The remote repository had **older versions** of the files (without Google OAuth)
2. Your local changes (Google OAuth features) were **not committed** yet
3. The fetch/pull operation **replaced** your files with the remote versions

---

## 🛡️ How to Prevent This Problem

### Option 1: Commit Your Changes Before Fetching (Recommended)

**Always commit and push your changes before fetching:**

```bash
# 1. Stage all changes
git add .

# 2. Commit with a message
git commit -m "Add Google OAuth authentication"

# 3. Push to remote
git push origin main

# 4. Now it's safe to fetch
git fetch
```

### Option 2: Stash Your Changes Before Fetching

If you're not ready to commit:

```bash
# 1. Stash your changes (saves them temporarily)
git stash save "Work in progress - Google OAuth"

# 2. Fetch safely
git fetch

# 3. Restore your changes
git stash pop
```

### Option 3: Use Branches

Work on a separate branch:

```bash
# 1. Create and switch to a new branch
git checkout -b feature/google-oauth

# 2. Make your changes
# 3. Commit
git add .
git commit -m "Add Google OAuth"

# 4. Push your branch
git push origin feature/google-oauth

# 5. Fetch is now safe on main branch
git checkout main
git fetch
```

---

## 🔧 How to Restore Your Google OAuth Setup

Since the files were overwritten, you need to recreate them. Here's the complete setup:

### Step 1: Install Missing Dependencies (if needed)

```bash
npm install passport passport-google-oauth20 express-session @types/passport @types/passport-google-oauth20 @types/express-session
```

### Step 2: Create Passport Configuration

Create file: `src/config/passport.ts`

```typescript
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User, IUser } from "../models/User";
import { getEnv } from "./env";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error, false);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: getEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
      callbackURL: getEnv("GOOGLE_CALLBACK_URL"),
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const fullName = profile.displayName;
        const profilePicture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error("No email found in Google profile"), false);
        }

        let user = await User.findByGoogleId(googleId);

        if (user) {
          return done(null, user);
        }

        user = await User.findByEmail(email);

        if (user) {
          const updatedUser = await User.linkGoogleAccount(
            String(user.id),
            googleId,
            profilePicture
          );
          return done(null, updatedUser);
        }

        const newUser = await User.createGoogleUser(
          fullName,
          email,
          googleId,
          profilePicture
        );

        return done(null, newUser);
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
);

export default passport;
```

### Step 3: Create Google Auth Controller

Create file: `src/controllers/googleAuthController.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { generateToken } from "../helpers/jwt";
import { IUser } from "../models/User";

export const googleAuthCallback = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const user = req.user as IUser;

    if (!user) {
      return res.redirect("/api/auth/google/failure");
    }

    const token = generateToken({
      id: user.id!,
      email: user.email,
      full_name: user.full_name,
    });

    res.send(\`<!DOCTYPE html>
<html>
<head>
  <title>✅ Authentication Successful</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    .token { background: #f5f5f5; padding: 20px; margin: 20px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>✅ Google Login Successful!</h1>
  <p><strong>Name:</strong> \${user.full_name}</p>
  <p><strong>Email:</strong> \${user.email}</p>
  <h3>Your JWT Token:</h3>
  <div class="token">\${token}</div>
  <button onclick="navigator.clipboard.writeText('\${token}')">Copy Token</button>
</body>
</html>\`);
  } catch (error) {
    res.redirect("/api/auth/google/failure");
  }
};

export const googleAuthSuccess = (req: Request, res: Response) => {
  if (req.user) {
    const user = req.user as IUser;
    const token = generateToken({
      id: user.id!,
      email: user.email,
      full_name: user.full_name,
    });

    res.status(200).json({
      status: "success",
      data: { user, token },
    });
  } else {
    res.status(401).json({
      status: "fail",
      message: "Authentication failed",
    });
  }
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
      return res.status(500).json({ status: "error", message: "Error logging out" });
    }
    res.status(200).json({ status: "success", message: "Logged out successfully" });
  });
};
```

### Step 4: Create Google Auth Routes

Create file: `src/routes/googleAuthRoutes.ts`

```typescript
import { Router } from "express";
import passport from "passport";
import {
  googleAuthCallback,
  googleAuthSuccess,
  googleAuthFailure,
  logout,
} from "../controllers/googleAuthController";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/failure",
  }),
  googleAuthCallback
);

router.get("/google/success", googleAuthSuccess);

router.get("/google/failure", googleAuthFailure);

router.post("/logout", logout);

export default router;
```

### Step 5: Update env.ts (Already Done ✅)

Your `src/config/env.ts` should already include:

```typescript
const required = [
  // ... existing vars
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "SESSION_SECRET",
];
```

### Step 6: Update User.ts (Already Done ✅)

Your `src/models/User.ts` should include Google OAuth static methods.

### Step 7: Update server.ts (Already Done ✅)

Your `src/server.ts` should include:
- Session middleware
- Passport initialization  
- Google auth routes

---

## ✅ Quick Recovery Command

Run this in PowerShell to check what's missing:

```powershell
Write-Host "Checking files..." -ForegroundColor Yellow
if (Test-Path "src\config\passport.ts") { Write-Host "✅ passport.ts exists" -ForegroundColor Green } else { Write-Host "❌ passport.ts missing" -ForegroundColor Red }
if (Test-Path "src\controllers\googleAuthController.ts") { Write-Host "✅ googleAuthController.ts exists" -ForegroundColor Green } else { Write-Host "❌ googleAuthController.ts missing" -ForegroundColor Red }
if (Test-Path "src\routes\googleAuthRoutes.ts") { Write-Host "✅ googleAuthRoutes.ts exists" -ForegroundColor Green } else { Write-Host "❌ googleAuthRoutes.ts missing" -ForegroundColor Red }
```

---

## 📝 Best Practices Going Forward

### 1. **Always Check Status Before Fetch**

```bash
git status
```

If you see "Changes not staged for commit", **commit first**!

### 2. **Use .gitignore Properly**

Make sure `.env` is in `.gitignore`:

```
node_modules/
.env
.env.local
dist/
build/
```

### 3. **Commit Often**

```bash
# After adding a feature
git add .
git commit -m "Add Google OAuth authentication"
git push
```

### 4. **Use Descriptive Commit Messages**

- ✅ Good: "Add Google OAuth with Passport.js"
- ❌ Bad: "update files"

### 5. **Check GitHub Desktop Before Fetching**

In GitHub Desktop, look at:
- **Changes** tab - shows your local changes
- If you have changes, **commit them first** before fetching

---

## 🎯 Quick Fix: Restore Google OAuth Now

Since your main files (env.ts, User.ts, server.ts) are already updated, you just need to create the 3 missing files:

1. Copy the code from Step 2 into `src/config/passport.ts`
2. Copy the code from Step 3 into `src/controllers/googleAuthController.ts`
3. Copy the code from Step 4 into `src/routes/googleAuthRoutes.ts`

Then run:

```bash
npm run dev
```

Visit: `http://localhost:3000/api/auth/google`

---

## 🆘 If Problem Happens Again

1. **Don't panic!**
2. **Check git log:** `git log --oneline`
3. **Restore from previous commit:** `git checkout HEAD~1 -- src/config/passport.ts`
4. **Or use GitHub Desktop:** Right-click file → "Discard Changes" (only if you want to undo)

---

## 💡 Remember

> **"Commit early, commit often"** - This prevents losing work!

Always:
1. Make changes
2. Test
3. Commit
4. Push
5. **Then** fetch/pull

This way, your work is always safe on GitHub even if local files get overwritten!

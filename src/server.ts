import express, { Request, Response } from "express";
import helmet from "helmet";
import hpp from "hpp";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import googleAuthRoutes from "./routes/googleAuthRoutes";
import dotenv from "dotenv";
import { validateEnv } from "./config/env";
import { connectDB } from "./config/database";
import { errorHandler } from "./middlewares/errorHandler";
import morgan from "morgan";
import { apiRateLimit } from "./config/rateLimits";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport";

dotenv.config();

// Validate environment variables on startup
validateEnv();

const app: express.Application = express();
const port: number = +process.env.PORT!;

// CORS configuration - MUST be before other middleware
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:4200",
      "http://localhost:4200",
      "http://127.0.0.1:4200"
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options(/.*/, cors());

// Set security hardening - Configure helmet to not interfere with CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "*.googleusercontent.com", "*.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      }
    }
  })
);

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Body parser - MUST be before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (must come before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production" && process.env.USE_HTTPS === "true", // Only secure in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging
const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

// Apply rate limiting AFTER CORS but BEFORE routes
app.use(apiRateLimit);

// Register routes
app.get("/", function (_req: Request, res: Response) {
  res.send("Hello World!");
});

app.get("/api/test", (_req: Request, res: Response) => {
  res.json({ message: "API is working!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/users", userRoutes);

console.log("📍 Registered routes:");
console.log(" - GET /");
console.log(" - GET /api/test");
console.log(" - /api/auth (authRoutes)");
console.log(" - /api/auth (googleAuthRoutes)");
console.log(" - /api/users (userRoutes)");

// 404 handler (must come after all routes)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, _promise) => {
  console.error("💥 Unhandled Promise Rejection:", reason);
  process.exit(1);
});

// Connect to database and start server
if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    app.listen(port, "0.0.0.0", function () {
      console.log(`🚀 Server started on port: ${port}`);
      console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:4200"}`);
    });
  });
} else {
  app.listen(port, function () {
    console.log(`🧪 Test server started on port: ${port}`);
  });
}

export default app;

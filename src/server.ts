import express, { Request, Response } from "express";
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

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

// Session middleware (must come before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(apiRateLimit);
app.use(express.json());

const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

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
console.log("  - GET /");
console.log("  - GET /api/test");
console.log("  - /api/auth (authRoutes)");
console.log("  - /api/auth (googleAuthRoutes)");
console.log("  - /api/users (userRoutes)");

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
    app.listen(port, function () {
      console.log(`🚀 Server started on port: ${port}`);
    });
  });
} else {
  app.listen(port, function () {
    console.log(`🧪 Test server started on port: ${port}`);
  });
}

export default app;

// restart

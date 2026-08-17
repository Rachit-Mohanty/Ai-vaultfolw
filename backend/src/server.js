import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "no-referrer" }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." }
}));

// CORS
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
});

// Database
connectDB();

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "AI Knowledge Vault API is running 🚀",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Document files must be 10 MB or smaller." });
  }
  if (error.name === "MulterError") {
    return res.status(400).json({ message: "The document upload could not be processed." });
  }
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ message: "Origin is not allowed." });
  }
  console.error("Unhandled API error:", error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

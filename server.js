require("dotenv").config();
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch (e) {}
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");

const User = require("./models/User");
const QuizHistory = require("./models/QuizHistory");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "quizwee_secret_jwt_2026";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quizwee";

// Default Administrator Credentials
const DEFAULT_ADMIN = {
  name: "System Administrator",
  email: (process.env.ADMIN_EMAIL || "admin@quizwee.ai").toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "admin123",
  role: "admin"
};

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// In-Memory Rate Limiter for Authentication (Brute-force protection)
const authRateLimitMap = new Map(); // ip -> { count, resetTime }

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 15; // Max 15 attempts per minute per IP

  let record = authRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    authRateLimitMap.set(ip, record);
    return next();
  }

  if (record.count >= maxAttempts) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many authentication attempts. Please wait ${retrySec} seconds before retrying.`
    });
  }

  record.count++;
  next();
}

// Strict Server-Side Validation Helpers
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(trimmed) && trimmed.length <= 254;
}

function isValidPassword(password) {
  if (typeof password !== "string") return false;
  return password.length >= 6 && password.length <= 128;
}

function isValidName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  const re = /^[a-zA-Z\s.'-]{2,60}$/;
  return re.test(trimmed);
}

// In-Memory fallback store if MongoDB is not reachable locally
let isMongoConnected = false;
const inMemoryUsers = new Map();
const inMemoryHistory = [];

async function seedAdminUser() {
  try {
    if (isMongoConnected) {
      const existing = await User.findOne({ email: DEFAULT_ADMIN.email });
      if (!existing) {
        const adminUser = new User({
          name: DEFAULT_ADMIN.name,
          email: DEFAULT_ADMIN.email,
          password: DEFAULT_ADMIN.password,
          role: "admin"
        });
        await adminUser.save();
        console.log(`[Admin] Default admin account seeded: ${DEFAULT_ADMIN.email}`);
      }
    } else {
      if (!inMemoryUsers.has(DEFAULT_ADMIN.email)) {
        const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
        inMemoryUsers.set(DEFAULT_ADMIN.email, {
          id: "mem_admin_01",
          _id: "mem_admin_01",
          name: DEFAULT_ADMIN.name,
          email: DEFAULT_ADMIN.email,
          password: hash,
          role: "admin",
          quizzes_taken: 0,
          createdAt: new Date()
        });
        console.log(`[Admin] In-memory default admin initialized: ${DEFAULT_ADMIN.email}`);
      }
    }
  } catch (err) {
    console.warn("[Admin Seed Notice]:", err.message);
  }
}

// MongoDB Connection
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 4000
  })
  .then(async () => {
    isMongoConnected = true;
    console.log("MongoDB connected successfully to:", MONGODB_URI.includes("@") ? MONGODB_URI.split("@")[1] : MONGODB_URI);
    await seedAdminUser();
  })
  .catch((err) => {
    isMongoConnected = false;
    console.warn("MongoDB connection notice: Unable to reach MongoDB server (" + (err.message || "timeout") + ").");
    console.warn("Using secure in-memory fallback for local development until MongoDB Atlas is configured in .env!");
    seedAdminUser();
  });

// JWT Verification Helper
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required. Please sign in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Session expired or invalid token. Please sign in again." });
    }
    req.user = decoded;
    next();
  });
}

// Admin Authorization Guard
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access forbidden. Administrator privileges required." });
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

// POST /api/auth/register (With Rate Limiting & Validation)
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!isValidName(name)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid full name (2–60 characters, letters only)."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address (e.g. name@domain.com)."
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long (maximum 128 characters)."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const sanitizedName = name.trim();

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }

      const newUser = new User({
        name: sanitizedName,
        email: normalizedEmail,
        password: password,
        role: "student"
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        success: true,
        message: "Account created successfully!",
        token,
        user: newUser.toSafeObject(),
        dbMode: "mongodb"
      });
    } else {
      // Memory Store Fallback
      if (inMemoryUsers.has(normalizedEmail)) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const fakeId = "mem_" + Date.now();
      const userData = {
        id: fakeId,
        _id: fakeId,
        name: sanitizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: "student",
        quizzes_taken: 0,
        createdAt: new Date()
      };

      inMemoryUsers.set(normalizedEmail, userData);

      const token = jwt.sign(
        { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const safeUser = { ...userData };
      delete safeUser.password;

      return res.status(201).json({
        success: true,
        message: "Account created successfully (local mode)!",
        token,
        user: safeUser,
        dbMode: "in-memory"
      });
    }
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Registration failed: " + (error.message || "Server error") });
  }
});

// POST /api/auth/login (With Rate Limiting, Validation & Timing Attack Defense)
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password format."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isMongoConnected) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Mitigation against timing attacks
        await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr");
        return res.status(400).json({ success: false, message: "Invalid email or password." });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid email or password." });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, name: user.name, role: user.role || "student" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: user.role === "admin" ? "Welcome to Admin Dashboard!" : "Logged in successfully!",
        token,
        user: user.toSafeObject(),
        dbMode: "mongodb"
      });
    } else {
      // Memory Store Fallback
      const user = inMemoryUsers.get(normalizedEmail);
      if (!user) {
        // Mitigation against timing attacks
        await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr");
        return res.status(400).json({ success: false, message: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid email or password." });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role || "student" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const safeUser = { ...user };
      delete safeUser.password;

      return res.json({
        success: true,
        message: user.role === "admin" ? "Welcome to Admin Dashboard!" : "Logged in successfully!",
        token,
        user: safeUser,
        dbMode: "in-memory"
      });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Login failed: " + (error.message || "Server error") });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    if (isMongoConnected) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      return res.json({ success: true, user: user.toSafeObject(), dbMode: "mongodb" });
    } else {
      const user = inMemoryUsers.get(req.user.email);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      const safeUser = { ...user };
      delete safeUser.password;
      return res.json({ success: true, user: safeUser, dbMode: "in-memory" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});

// POST /api/quiz/save-result
app.post("/api/quiz/save-result", authenticateToken, async (req, res) => {
  try {
    const { topic, difficulty, scorePercent, correctCount, incorrectCount, unattemptedCount, totalQuestions, timeTakenSeconds, submissionType } = req.body;

    const record = {
      userId: req.user.id,
      topic: topic || "General Quiz",
      difficulty: difficulty || "medium",
      scorePercent: Number(scorePercent) || 0,
      correctCount: Number(correctCount) || 0,
      incorrectCount: Number(incorrectCount) || 0,
      unattemptedCount: Number(unattemptedCount) || 0,
      totalQuestions: Number(totalQuestions) || 1,
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      submissionType: submissionType || "Normal Submit",
      createdAt: new Date()
    };

    if (isMongoConnected) {
      const saved = await QuizHistory.create(record);
      await User.findByIdAndUpdate(req.user.id, { $inc: { quizzes_taken: 1 } });
      return res.status(201).json({ success: true, data: saved });
    } else {
      record._id = "hist_" + Date.now();
      inMemoryHistory.push(record);
      const user = inMemoryUsers.get(req.user.email);
      if (user) user.quizzes_taken = (user.quizzes_taken || 0) + 1;
      return res.status(201).json({ success: true, data: record });
    }
  } catch (error) {
    console.error("Save Quiz Error:", error);
    res.status(500).json({ success: false, message: "Failed to record quiz result." });
  }
});

// GET /api/quiz/my-history
app.get("/api/quiz/my-history", authenticateToken, async (req, res) => {
  try {
    if (isMongoConnected) {
      const history = await QuizHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
      return res.json({ success: true, data: history });
    } else {
      const history = inMemoryHistory.filter((h) => h.userId === req.user.id).slice(-20).reverse();
      return res.json({ success: true, data: history });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch quiz history." });
  }
});

// -------------------------------------------------------------
// ADMIN PANEL ROUTES (Protected by requireAdmin)
// -------------------------------------------------------------

// GET /api/admin/overview - Statistics
app.get("/api/admin/overview", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let totalUsers = 0;
    let totalQuizzes = 0;

    if (isMongoConnected) {
      totalUsers = await User.countDocuments();
      totalQuizzes = await QuizHistory.countDocuments();
    } else {
      totalUsers = inMemoryUsers.size;
      totalQuizzes = inMemoryHistory.length;
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalQuizzes,
        database: isMongoConnected ? "MongoDB Atlas (Online)" : "In-Memory DB (Local Mode)",
        adminEmail: req.user.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch admin overview." });
  }
});

// GET /api/admin/users - List all users
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (isMongoConnected) {
      const users = await User.find().select("-password").sort({ createdAt: -1 });
      return res.json({ success: true, users });
    } else {
      const users = Array.from(inMemoryUsers.values()).map((u) => {
        const copy = { ...u };
        delete copy.password;
        return copy;
      });
      return res.json({ success: true, users });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
});

// DELETE /api/admin/users/:id - Delete a user
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
    }

    if (isMongoConnected) {
      await User.findByIdAndDelete(targetId);
      await QuizHistory.deleteMany({ userId: targetId });
      return res.json({ success: true, message: "User deleted successfully." });
    } else {
      let foundKey = null;
      for (const [email, user] of inMemoryUsers.entries()) {
        if (user.id === targetId || user._id === targetId) {
          foundKey = email;
          break;
        }
      }
      if (foundKey) inMemoryUsers.delete(foundKey);
      return res.json({ success: true, message: "User deleted successfully." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user." });
  }
});

// GET /api/admin/quiz-history - All assessment logs across all users
app.get("/api/admin/quiz-history", authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (isMongoConnected) {
      const history = await QuizHistory.find().populate("userId", "name email").sort({ createdAt: -1 }).limit(100);
      return res.json({ success: true, history });
    } else {
      const history = inMemoryHistory.slice(-100).reverse().map((item) => {
        let userMatch = null;
        for (const u of inMemoryUsers.values()) {
          if (u.id === item.userId || u._id === item.userId) {
            userMatch = { name: u.name, email: u.email };
            break;
          }
        }
        return { ...item, userId: userMatch || { name: "Student", email: "student@quizwee.ai" } };
      });
      return res.json({ success: true, history });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch quiz history." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    database: isMongoConnected ? "MongoDB Atlas Connected" : "Local Memory Store Active",
    version: "2.5.0",
    timestamp: new Date()
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Catch-all: serve index.html for any frontend navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quizwee AI Server running at: http://localhost:${PORT}/index.html`);
  });
}

module.exports = app;

// ============================================================
// FoodPro REST API — Main Server
// ============================================================
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const processesRouter = require("./routes/processes");
const authRouter = require("./routes/auth");
const verifyToken = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const START_TIME = Date.now();

// ─── Middleware ───────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Simple rate limiter (per IP, in-memory) ─────────────────
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 200;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_LIMIT_WINDOW) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count++;
  }

  requestCounts.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment.",
      data: null,
    });
  }

  next();
});

// ─── Request logger (dev) ─────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ─── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FoodPro REST API is running 🚀",
    version: "2.0.0",
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    endpoints: {
      processes: "/api/processes",
      stats: "/api/stats",
      health: "/api/health",
    },
  });
});

// ─── Health endpoint ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  res.json({
    success: true,
    message: "Healthy",
    data: {
      status: "ok",
      uptime: {
        seconds: uptimeSeconds,
        minutes: uptimeMinutes,
        hours: uptimeHours,
        display:
          uptimeHours > 0
            ? `${uptimeHours}h ${uptimeMinutes % 60}m`
            : uptimeMinutes > 0
            ? `${uptimeMinutes}m ${uptimeSeconds % 60}s`
            : `${uptimeSeconds}s`,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "2.0.0",
    },
  });
});

// ─── Stats endpoint ───────────────────────────────────────────
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

app.get("/api/stats", async (req, res) => {
  try {
    const [total, active, inactive, byCategory] = await Promise.all([
      prisma.process.count(),
      prisma.process.count({ where: { status: "active" } }),
      prisma.process.count({ where: { status: "inactive" } }),
      prisma.process.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    const categories = byCategory.map((c) => ({
      category: c.category,
      count: c._count._all,
    }));

    res.json({
      success: true,
      message: "Stats retrieved",
      data: {
        total,
        active,
        inactive,
        activeRate: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        categories,
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("GET /api/stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      data: null,
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/processes", verifyToken, processesRouter);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    data: null,
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null,
  });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  FoodPro API v2.0 running on http://localhost:${PORT}`);
  console.log(`📋  Endpoints:`);
  console.log(`    GET    http://localhost:${PORT}/api/health`);
  console.log(`    GET    http://localhost:${PORT}/api/stats`);
  console.log(`    GET    http://localhost:${PORT}/api/processes`);
  console.log(`    GET    http://localhost:${PORT}/api/processes/:id`);
  console.log(`    POST   http://localhost:${PORT}/api/processes`);
  console.log(`    PUT    http://localhost:${PORT}/api/processes/:id`);
  console.log(`    PATCH  http://localhost:${PORT}/api/processes/:id`);
  console.log(`    DELETE http://localhost:${PORT}/api/processes/:id`);
  console.log(`\n    Pagination: GET /api/processes?page=1&limit=10`);
  console.log(
    `    Search: GET /api/processes?search=dairy&category=Thermal Processing`
  );
  console.log(`    Sort:   GET /api/processes?sortBy=title&sortOrder=asc`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});

module.exports = app;

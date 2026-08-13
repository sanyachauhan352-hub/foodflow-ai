// ============================================================
// Routes: /api/processes
// Endpoints:
//   GET    /api/processes          — get all (search, filter, sort, paginate)
//   GET    /api/processes/:id      — get single by id
//   POST   /api/processes          — create new
//   PUT    /api/processes/:id      — full update
//   PATCH  /api/processes/:id      — partial update
//   DELETE /api/processes/:id      — delete
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// ─── Helper: send success ────────────────────────────────────
const ok = (res, data, message = "Success", statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

// ─── Helper: send error ──────────────────────────────────────
const fail = (res, message = "Error", statusCode = 400) =>
  res.status(statusCode).json({ success: false, message, data: null });

// ─── Helper: format process for client ───────────────────────
const formatProcess = (p) => {
  if (!p) return null;
  let complianceArray = [];
  try {
    complianceArray = JSON.parse(p.compliance);
  } catch (err) {
    complianceArray = [];
  }
  return {
    ...p,
    compliance: complianceArray,
  };
};

// ─── GET /api/processes ──────────────────────────────────────
// Query params: ?search=<term>&category=<cat>&status=<status>
//               &sortBy=<field>&sortOrder=asc|desc
//               &page=<n>&limit=<n>
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      page,
      limit,
    } = req.query;

    const where = {};

    if (category) {
      where.category = { equals: category };
    }

    if (status) {
      where.status = { equals: status };
    }

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
      ];
    }

    // Validate sortBy field
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "title",
      "category",
      "status",
      "temperature",
      "duration",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 0));
    const usePagination = limitNum > 0;

    const queryOptions = {
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
    };

    if (usePagination) {
      queryOptions.skip = (pageNum - 1) * limitNum;
      queryOptions.take = limitNum;
    }

    const [records, totalCount] = await Promise.all([
      prisma.process.findMany(queryOptions),
      prisma.process.count({ where }),
    ]);

    const formatted = records.map(formatProcess);

    const responseData = {
      total: totalCount,
      count: formatted.length,
      processes: formatted,
    };

    if (usePagination) {
      responseData.pagination = {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum * limitNum < totalCount,
        hasPrevPage: pageNum > 1,
      };
    }

    ok(res, responseData);
  } catch (err) {
    console.error("GET /api/processes error:", err);
    fail(res, err.message, 500);
  }
});

// ─── GET /api/processes/:id ──────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const record = await prisma.process.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return fail(res, "Process not found", 404);
    ok(res, formatProcess(record));
  } catch (err) {
    console.error("GET /api/processes/:id error:", err);
    fail(res, err.message, 500);
  }
});

// ─── POST /api/processes ─────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, description, category, temperature, duration, compliance } =
      req.body;

    // Validation
    if (!title || !description || !category) {
      return fail(res, "title, description, and category are required", 400);
    }

    if (title.trim().length < 3) {
      return fail(res, "Title must be at least 3 characters", 400);
    }

    const complianceStr = Array.isArray(compliance)
      ? JSON.stringify(compliance.filter(Boolean))
      : JSON.stringify([]);

    const newRecord = await prisma.process.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        temperature: temperature ? temperature.trim() : "Ambient",
        duration: duration ? duration.trim() : "N/A",
        compliance: complianceStr,
        status: "active",
      },
    });

    ok(res, formatProcess(newRecord), "Process created successfully", 201);
  } catch (err) {
    console.error("POST /api/processes error:", err);
    fail(res, err.message, 500);
  }
});

// ─── PUT /api/processes/:id ──────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.process.findUnique({ where: { id } });
    if (!existing) return fail(res, "Process not found", 404);

    const {
      title,
      description,
      category,
      temperature,
      duration,
      compliance,
      status,
    } = req.body;

    if (!title || !description || !category) {
      return fail(res, "title, description, and category are required", 400);
    }

    const complianceStr = Array.isArray(compliance)
      ? JSON.stringify(compliance.filter(Boolean))
      : existing.compliance;

    const updatedRecord = await prisma.process.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        temperature: temperature ? temperature.trim() : existing.temperature,
        duration: duration ? duration.trim() : existing.duration,
        compliance: complianceStr,
        status: status ? status.trim() : existing.status,
      },
    });

    ok(res, formatProcess(updatedRecord), "Process updated successfully");
  } catch (err) {
    console.error("PUT /api/processes/:id error:", err);
    fail(res, err.message, 500);
  }
});

// ─── PATCH /api/processes/:id ────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.process.findUnique({ where: { id } });
    if (!existing) return fail(res, "Process not found", 404);

    const allowedFields = [
      "title",
      "description",
      "category",
      "temperature",
      "duration",
      "compliance",
      "status",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "compliance" && Array.isArray(req.body[field])) {
          updates[field] = JSON.stringify(req.body[field].filter(Boolean));
        } else if (typeof req.body[field] === "string") {
          updates[field] = req.body[field].trim();
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return fail(res, "No valid fields to update", 400);
    }

    const updatedRecord = await prisma.process.update({
      where: { id },
      data: updates,
    });

    ok(res, formatProcess(updatedRecord), "Process partially updated");
  } catch (err) {
    console.error("PATCH /api/processes/:id error:", err);
    fail(res, err.message, 500);
  }
});

// ─── DELETE /api/processes/:id ───────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.process.findUnique({ where: { id } });
    if (!existing) return fail(res, "Process not found", 404);

    const deletedRecord = await prisma.process.delete({ where: { id } });

    ok(res, formatProcess(deletedRecord), "Process deleted successfully");
  } catch (err) {
    console.error("DELETE /api/processes/:id error:", err);
    fail(res, err.message, 500);
  }
});

// ─── DELETE /api/processes (bulk) ────────────────────────────
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(res, "ids array is required for bulk delete", 400);
    }

    const { count } = await prisma.process.deleteMany({
      where: { id: { in: ids } },
    });

    ok(res, { deletedCount: count }, `${count} process(es) deleted`);
  } catch (err) {
    console.error("DELETE /api/processes (bulk) error:", err);
    fail(res, err.message, 500);
  }
});

module.exports = router;

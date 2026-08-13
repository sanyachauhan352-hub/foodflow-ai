const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "foodpro_super_secret_key_123";

const verifyToken = (req, res, next) => {
  // Support both capitalized and lowercased headers
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
      data: null,
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
      data: null,
    });
  }
};

module.exports = verifyToken;

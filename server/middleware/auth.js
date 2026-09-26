const User = require("../models/User");
const { verifyToken } = require("../utils/auth");

/**
 * Authentication middleware that verifies JWT from Authorization header
 * and attaches the authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Access denied. Token missing." });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    // Exclude password hash from loaded user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "User no longer exists or invalid token." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth protect middleware error:", error);
    return res.status(500).json({ error: "Authentication verification failed." });
  }
};

/**
 * Role-based authorization middleware.
 * Must be executed after protect().
 * Supports roles: 'seeker', 'provider', 'both'.
 * Users with role 'both' possess both seeker and provider capabilities.
 *
 * @param  {...string} roles - Permitted roles (e.g. 'seeker', 'provider')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    const userRole = req.user.role;

    // Check direct role match
    const isDirectMatch = roles.includes(userRole);

    // Role 'both' has both seeker and provider capabilities
    const isBothAuthorized =
      userRole === "both" &&
      (roles.includes("seeker") || roles.includes("provider") || roles.includes("both"));

    if (isDirectMatch || isBothAuthorized) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden. Insufficient role permissions." });
  };
};

module.exports = {
  protect,
  authorize
};

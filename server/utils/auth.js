const jwt = require("jsonwebtoken");

/**
 * Retrieve the JWT secret from environment variables.
 * In production, JWT_SECRET is strictly required.
 * In development, a fallback secret is provided for local execution.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return "resshare-dev-secret-key-change-in-production";
  }
  return secret;
}

/**
 * Retrieve JWT expiration duration from environment or default to 7 days.
 */
function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "7d";
}

/**
 * Generate a signed JWT for a user.
 * Payload only contains the user's MongoDB ID.
 * Password and sensitive business details are excluded.
 *
 * @param {Object|string} user - User document or user ObjectId string
 * @returns {string} Signed JWT token
 */
function generateToken(user) {
  const userId = user && (user._id || user.id) ? (user._id || user.id).toString() : user;
  if (!userId) {
    throw new Error("Valid user or user ID is required to generate token");
  }

  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: getJwtExpiresIn()
  });
}

/**
 * Verify a JWT and return the decoded payload.
 *
 * @param {string} token - Bearer JWT token string
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
  generateToken,
  verifyToken
};

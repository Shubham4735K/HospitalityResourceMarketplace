const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { generateToken } = require("../utils/auth");

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with business profile and credentials.
 */
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role, businessProfile } = req.body;

    // Validate required fields
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const allowedRoles = ["seeker", "provider", "both", "admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Role must be 'seeker', 'provider', 'both', or 'admin'." });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    // Create user document
    const user = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: role || "seeker",
      businessProfile: businessProfile || {}
    });

    await user.save();

    // Generate JWT
    const token = generateToken(user);

    // Return safe user object (password excluded via toJSON)
    return res.status(201).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email is already registered." });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Failed to register user." });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Compare candidate password with stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check account status
    if (user.status && user.status !== "Active") {
      return res.status(403).json({
        error: `Account is ${user.status.toLowerCase()}. Access denied. Please contact platform administration.`
      });
    }

    // Generate JWT
    const token = generateToken(user);

    // Return safe user profile
    return res.status(200).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to log in." });
  }
});

/**
 * GET /api/auth/me
 * Retrieve the currently authenticated user's safe profile.
 */
router.get("/me", protect, (req, res) => {
  try {
    return res.status(200).json({
      user: req.user.toJSON ? req.user.toJSON() : req.user
    });
  } catch (error) {
    console.error("Get /me error:", error);
    return res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

module.exports = router;

/**
 * ResShare — AI Analysis Route
 *
 * Exposes POST /api/ai/analyze to the React frontend.
 * Intermediates between frontend requests and backend Nugen service.
 * NEVER exposes the Nugen API key to the client.
 */

const express = require("express");
const router = express.Router();
const { analyzeRequirement } = require("../services/nugenService");

router.post("/analyze", async (req, res) => {
  try {
    const prompt = req.body.message || req.body.prompt || req.body.requirement;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Invalid requirement",
        reason: "Please provide a non-empty requirement text."
      });
    }

    const result = await analyzeRequirement(prompt);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to analyze requirement:", error);
    return res.status(500).json({
      error: "Analysis failed",
      reason: error.message || "An unexpected error occurred while analyzing the requirement."
    });
  }
});

module.exports = router;

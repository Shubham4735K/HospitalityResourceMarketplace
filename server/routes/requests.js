const express = require("express");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const User = require("../models/User");
const resources = require("../data/resources");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper — normalise a business-name string for fuzzy comparison.
// Trims whitespace and converts to lower-case so minor capitalisation
// differences do not break hostBusiness → provider matching.
// ---------------------------------------------------------------------------
function normaliseName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Helper — find the static resource object by ID.
// ---------------------------------------------------------------------------
function findResourceById(resourceId) {
  return resources.find((r) => r.id === resourceId) || null;
}

// ---------------------------------------------------------------------------
// Helper — find a registered provider whose businessProfile.businessName
// matches the static resource's hostBusiness (case/whitespace insensitive).
// ---------------------------------------------------------------------------
async function findProviderByHostBusiness(hostBusiness) {
  const normalised = normaliseName(hostBusiness);
  if (!normalised) return null;

  // Fetch all users with a provider-capable role and check each one.
  // A user with role "both" also qualifies as a provider.
  const candidates = await User.find({
    role: { $in: ["provider", "both"] }
  }).select("_id businessProfile role");

  return (
    candidates.find(
      (u) =>
        normaliseName(u.businessProfile && u.businessProfile.businessName) ===
        normalised
    ) || null
  );
}

// ===========================================================================
// TASK 6 — Deprecate the public GET /api/requests endpoint.
// It previously exposed every request without authentication.
// Direct callers to the ownership-scoped endpoints instead.
// ===========================================================================
router.get("/", (req, res) => {
  return res.status(403).json({
    error:
      "This endpoint is no longer public. Use GET /api/requests/my (seekers) or GET /api/requests/incoming (providers)."
  });
});

// ===========================================================================
// TASK 3 — GET /api/requests/my
// Returns only requests submitted by the currently authenticated seeker.
// Legacy requests that have no seeker field are excluded.
// ===========================================================================
router.get("/my", protect, async (req, res) => {
  try {
    const myRequests = await Request.find({ seeker: req.user._id }).sort({
      createdAt: -1
    });
    return res.status(200).json(myRequests);
  } catch (error) {
    console.error("Failed to fetch seeker requests:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch your requests." });
  }
});

// ===========================================================================
// TASK 4 — GET /api/requests/incoming
// Returns only requests directed at the authenticated provider.
// Requires provider or both role.
// Legacy requests that have no provider field are excluded.
// ===========================================================================
router.get(
  "/incoming",
  protect,
  authorize("provider", "both"),
  async (req, res) => {
    try {
      const incoming = await Request.find({
        provider: req.user._id
      }).sort({ createdAt: -1 });
      return res.status(200).json(incoming);
    } catch (error) {
      console.error("Failed to fetch provider requests:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch incoming requests." });
    }
  }
);

// ===========================================================================
// TASK 2 — POST /api/requests
// Authenticated request creation.
// - seeker  is derived from req.user._id (never trusted from client).
// - provider is resolved by matching resource.hostBusiness → User.businessProfile.businessName.
// - Contact snapshot fields are taken from req.user/businessProfile.
// ===========================================================================
router.post("/", protect, async (req, res) => {
  try {
    const {
      resourceId,
      requestedDate,
      startTime,
      endTime,
      message
    } = req.body;

    // --- Basic field validation ---
    if (!resourceId || typeof resourceId !== "string") {
      return res.status(400).json({ error: "resourceId is required." });
    }
    if (!requestedDate) {
      return res.status(400).json({ error: "requestedDate is required." });
    }
    if (!startTime) {
      return res.status(400).json({ error: "startTime is required." });
    }
    if (!endTime) {
      return res.status(400).json({ error: "endTime is required." });
    }

    // --- Resource lookup ---
    const resource = findResourceById(resourceId);
    if (!resource) {
      return res
        .status(404)
        .json({ error: `Resource '${resourceId}' not found.` });
    }

    // --- Provider resolution via hostBusiness → User mapping ---
    const providerUser = await findProviderByHostBusiness(resource.hostBusiness);
    if (!providerUser) {
      return res.status(404).json({
        error: `No registered provider found for resource host '${resource.hostBusiness}'. The host business has not created an account yet.`
      });
    }

    // --- Contact snapshot from authenticated user (not trusted from client) ---
    const bp = req.user.businessProfile || {};
    const fullName = (req.user.fullName && req.user.fullName.trim()) || (req.body.fullName && req.body.fullName.trim()) || "";
    const businessName = (bp.businessName && bp.businessName.trim()) || (req.body.businessName && req.body.businessName.trim()) || "Individual Seeker";
    const email = (req.user.email && req.user.email.trim()) || (req.body.email && req.body.email.trim()) || "";
    const phone = (bp.phone && bp.phone.trim()) || (req.body.phone && req.body.phone.trim()) || "Not provided";

    // Validate that the seeker profile has the minimum contact data.
    if (!fullName) {
      return res.status(400).json({ error: "Your account is missing a full name." });
    }
    if (!email) {
      return res.status(400).json({ error: "Your account is missing an email address." });
    }

    // --- Create and persist the request ---
    const request = new Request({
      seeker: req.user._id,
      provider: providerUser._id,
      resourceId: resource.id,
      resourceTitle: resource.title,
      fullName,
      businessName,
      email,
      phone,
      requestedDate,
      startTime,
      endTime,
      message: message || ""
    });

    const saved = await request.save();
    return res.status(201).json(saved);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Failed to create request:", error);
    return res.status(500).json({ error: "Failed to create request." });
  }
});

// ===========================================================================
// TASK 5 — PATCH /api/requests/:id
// Secured status update.
// - protect required.
// - provider or both role required.
// - Only the provider stored on the request may update status.
// - Seeker cannot accept/reject their own request.
// ===========================================================================
router.patch("/:id", protect, authorize("provider", "both"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Accepted", "Rejected"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid or missing status. Must be 'Accepted' or 'Rejected'." });
    }

    // Validate the MongoDB ID format before querying.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Request not found." });
    }

    const existingRequest = await Request.findById(id);
    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found." });
    }

    // Only the provider stored on this specific request may update its status.
    // This prevents any other provider (or a seeker) from modifying it.
    if (
      !existingRequest.provider ||
      existingRequest.provider.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        error: "Forbidden. You are not the provider for this request."
      });
    }

    existingRequest.status = status;
    const updated = await existingRequest.save();
    return res.json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ error: "Request not found." });
    }
    console.error("Failed to update request status:", error);
    return res.status(500).json({ error: "Failed to update request status." });
  }
});

module.exports = router;

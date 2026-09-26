const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const User = require("./models/User");
const Request = require("./models/Request");
const Notification = require("./models/Notification");
const resources = require("./data/resources");
const { hasResourceDateConflict, hasDateConflict, hasTimeOverlap, parseTimeToMinutes } = require("./utils/conflict");
const { checkResourceAvailability, parseDateParts } = require("./utils/availability");
const { protect, authorize } = require("./middleware/auth");
const { verifyToken } = require("./utils/auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "ResShare backend is running"
    });
});

app.get("/api/resources", (req, res) => {
    res.json(resources);
});

app.post("/api/requests", async (req, res) => {
    try {
        const { resourceId, requestedDate } = req.body;

        if (resourceId && requestedDate) {
            const existingAccepted = await Request.find({
                resourceId,
                requestedDate,
                status: "Accepted"
            });

            if (existingAccepted.length > 0) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "This resource is already booked for the requested date."
                });
            }
        }

        const requestData = { ...req.body };

        // Resolve seeker from auth token if present
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    requestData.seeker = decoded.id;
                }
            } catch (authErr) {
                // Ignore token error for unauthenticated tests
            }
        }

        // Resolve provider from hostBusiness if available on authenticated request
        if (requestData.seeker && !requestData.provider && resourceId) {
            try {
                const mongoose = require("mongoose");
                if (mongoose.connection.readyState === 1) {
                    const resource = resources.find((r) => r.id === resourceId);
                    if (resource && resource.hostBusiness) {
                        const normalHost = resource.hostBusiness.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const providerUsers = await User.find({ role: { $in: ["provider", "both"] } }).select("_id businessProfile");
                        const matchedProvider = providerUsers.find(
                            (u) => u.businessProfile?.businessName?.toLowerCase().replace(/[^a-z0-9]/g, "") === normalHost
                        );
                        if (matchedProvider) {
                            requestData.provider = matchedProvider._id;
                        }
                    }
                }
            } catch (providerErr) {
                // Ignore provider lookup failure
            }
        }

        const request = new Request(requestData);
        const savedRequest = await request.save();

        try {
            const resource = resources.find((r) => r.id === savedRequest.resourceId);
            const hostBusiness = (resource && resource.hostBusiness) || "Resource Provider";
            const reqBusiness = savedRequest.businessName || savedRequest.fullName || "Requesting Business";
            const resTitle = savedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

            const notification = new Notification({
                recipient: hostBusiness,
                recipientRole: "provider",
                title: "New Booking Request",
                message: `${reqBusiness} submitted a booking request for ${resTitle}.`,
                requestId: savedRequest._id.toString(),
                resourceTitle: resTitle
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to create provider notification:", notifErr);
        }

        res.status(201).json(savedRequest);
    } catch (error) {
        console.error("Failed to create request:", error);
        res.status(500).json({ error: "Failed to create request" });
    }
});

// Authenticated seeker requests (Phase 12)
app.get("/api/requests/my", protect, async (req, res) => {
    try {
        const myRequests = await Request.find({ seeker: req.user._id }).sort({ createdAt: -1 });
        res.json(myRequests);
    } catch (error) {
        console.error("Failed to fetch seeker requests:", error);
        res.status(500).json({ error: "Failed to fetch your requests." });
    }
});

// Authenticated provider incoming requests (Phase 12)
app.get("/api/requests/incoming", protect, authorize("provider", "both"), async (req, res) => {
    try {
        const incoming = await Request.find({ provider: req.user._id }).sort({ createdAt: -1 });
        res.json(incoming);
    } catch (error) {
        console.error("Failed to fetch provider requests:", error);
        res.status(500).json({ error: "Failed to fetch incoming requests." });
    }
});

app.get("/api/requests", async (req, res) => {
    try {
        const allRequests = await Request.find();
        res.json(allRequests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

app.patch("/api/requests/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, providerNotes, counterProposal } = req.body;

        const allowedStatuses = ["Accepted", "Rejected", "Counter-Offered"];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid or missing status" });
        }

        if (providerNotes !== undefined && typeof providerNotes !== "string") {
            return res.status(400).json({ error: "providerNotes must be a string" });
        }

        const existingRequest = await Request.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ error: "Request not found" });
        }

        if (status === "Counter-Offered") {
            if (existingRequest.status !== "Pending") {
                return res.status(400).json({ error: "Only Pending requests can be counter-offered" });
            }

            if (!counterProposal || typeof counterProposal !== "object") {
                return res.status(400).json({ error: "counterProposal is required when status is Counter-Offered" });
            }

            const { date, notes } = counterProposal;

            if (!date || typeof date !== "string") {
                return res.status(400).json({ error: "date is required and must be a string" });
            }

            const cleanDate = date.trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
                return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
            }

            const dateParts = parseDateParts(cleanDate);
            if (!dateParts) {
                return res.status(400).json({ error: "Invalid calendar date" });
            }

            if (notes !== undefined && typeof notes !== "string") {
                return res.status(400).json({ error: "counterProposal.notes must be a string" });
            }

            const resource = resources.find((r) => r.id === existingRequest.resourceId);
            if (resource) {
                const availResult = checkResourceAvailability(resource, cleanDate);
                if (!availResult.available) {
                    return res.status(400).json({
                        error: availResult.reason || "The proposed date is not available for this resource."
                    });
                }
            }

            const conflictingAccepted = await Request.find({
                _id: { $ne: id },
                resourceId: existingRequest.resourceId,
                requestedDate: cleanDate,
                status: "Accepted"
            });

            if (conflictingAccepted.length > 0) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "The proposed date conflicts with an existing booking."
                });
            }

            existingRequest.status = "Counter-Offered";
            if (typeof providerNotes === "string") {
                existingRequest.providerNotes = providerNotes.trim();
            }
            existingRequest.counterProposal = {
                date: cleanDate,
                notes: typeof notes === "string" ? notes.trim() : ""
            };

            const updatedRequest = await existingRequest.save();
            return res.json(updatedRequest);
        }

        // Seeker response to provider counter-offer (Phase 10.3)
        if (existingRequest.status === "Counter-Offered") {
            if (status === "Accepted") {
                if (!existingRequest.counterProposal || !existingRequest.counterProposal.date) {
                    return res.status(400).json({
                        error: "Cannot accept counter offer without a valid counterProposal date"
                    });
                }

                const proposedDate = existingRequest.counterProposal.date.trim();

                const conflictingAccepted = await Request.find({
                    _id: { $ne: id },
                    resourceId: existingRequest.resourceId,
                    requestedDate: proposedDate,
                    status: "Accepted"
                });

                if (conflictingAccepted.length > 0) {
                    return res.status(409).json({
                        error: "Conflict",
                        reason: "The proposed date is no longer available for this resource."
                    });
                }

                existingRequest.status = "Accepted";
                existingRequest.requestedDate = proposedDate;
                // preserve existing startTime and endTime for backward compatibility
                // keep counterProposal
                // providerNotes remains unchanged
                const updatedRequest = await existingRequest.save();
                return res.json(updatedRequest);
            }

            if (status === "Rejected") {
                existingRequest.status = "Rejected";
                // keep counterProposal for historical display
                // do not perform resource conflict checking
                const updatedRequest = await existingRequest.save();
                return res.json(updatedRequest);
            }

            return res.status(400).json({
                error: "Invalid status transition for Counter-Offered request. Only Accepted or Rejected is allowed."
            });
        }

        // Terminal states cannot transition further
        if (existingRequest.status === "Accepted" || existingRequest.status === "Rejected") {
            return res.status(400).json({
                error: `Cannot modify a request that is already ${existingRequest.status}`
            });
        }

        if (status === "Accepted") {
            const otherAccepted = await Request.find({
                _id: { $ne: id },
                resourceId: existingRequest.resourceId,
                requestedDate: existingRequest.requestedDate,
                status: "Accepted"
            });

            if (otherAccepted.length > 0) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "Cannot accept request: resource is already booked for this date."
                });
            }
        }

        existingRequest.status = status;
        if (typeof providerNotes === "string") {
            existingRequest.providerNotes = providerNotes.trim();
        }
        const updatedRequest = await existingRequest.save();

        try {
            const resource = resources.find((r) => r.id === updatedRequest.resourceId);
            const hostBusiness = (resource && resource.hostBusiness) || "The resource provider";
            const seekerRecipient = updatedRequest.businessName || updatedRequest.fullName || "Requesting Business";
            const resTitle = updatedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

            const notification = new Notification({
                recipient: seekerRecipient,
                recipientRole: "seeker",
                title: status === "Accepted" ? "Request Accepted" : "Request Rejected",
                message: `Your request for ${resTitle} has been ${status.toLowerCase()} by ${hostBusiness}.`,
                requestId: updatedRequest._id.toString(),
                resourceTitle: resTitle
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to create seeker notification:", notifErr);
        }

        res.json(updatedRequest);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ error: "Request not found" });
        }
        console.error("Failed to update request status:", error);
        res.status(500).json({ error: "Failed to update request status" });
    }
});

app.get("/api/notifications", async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }

        notification.read = true;
        const updatedNotification = await notification.save();

        res.json(updatedNotification);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ error: "Notification not found" });
        }
        console.error("Failed to mark notification as read:", error);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
});

if (require.main === module) {
    connectDB().catch((err) => {
        console.error("MongoDB connection failed:", err.message);
    });

    app.listen(5000, () => {
        console.log("ResShare backend is running on port 5000");
    });
}

module.exports = app;

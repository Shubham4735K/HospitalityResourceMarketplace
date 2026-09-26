const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Request = require("./models/Request");
const resources = require("./data/resources");
const { hasResourceDateConflict, hasDateConflict, hasTimeOverlap, parseTimeToMinutes } = require("./utils/conflict");
const { checkResourceAvailability, parseDateParts } = require("./utils/availability");

const app = express();

app.use(cors());
app.use(express.json());

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

        const request = new Request(req.body);
        const savedRequest = await request.save();
        res.status(201).json(savedRequest);
    } catch (error) {
        console.error("Failed to create request:", error);
        res.status(500).json({ error: "Failed to create request" });
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

        res.json(updatedRequest);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ error: "Request not found" });
        }
        console.error("Failed to update request status:", error);
        res.status(500).json({ error: "Failed to update request status" });
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

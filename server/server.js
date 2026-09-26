const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Request = require("./models/Request");
const resources = require("./data/resources");
const { hasTimeOverlap } = require("./utils/conflict");

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
        const { resourceId, requestedDate, startTime, endTime } = req.body;

        if (resourceId && requestedDate && startTime && endTime) {
            const existingAccepted = await Request.find({
                resourceId,
                requestedDate,
                status: "Accepted"
            });

            const conflict = existingAccepted.find((b) =>
                hasTimeOverlap(startTime, endTime, b.startTime, b.endTime)
            );

            if (conflict) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "This resource is already booked for the requested date and time window."
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
        const { status } = req.body;

        const allowedStatuses = ["Accepted", "Rejected"];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid or missing status" });
        }

        const existingRequest = await Request.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ error: "Request not found" });
        }

        if (status === "Accepted") {
            const otherAccepted = await Request.find({
                _id: { $ne: id },
                resourceId: existingRequest.resourceId,
                requestedDate: existingRequest.requestedDate,
                status: "Accepted"
            });

            const conflict = otherAccepted.find((b) =>
                hasTimeOverlap(existingRequest.startTime, existingRequest.endTime, b.startTime, b.endTime)
            );

            if (conflict) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "Cannot accept request: overlaps with an already accepted booking."
                });
            }
        }

        existingRequest.status = status;
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


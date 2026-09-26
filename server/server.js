const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Request = require("./models/Request");
const Notification = require("./models/Notification");
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


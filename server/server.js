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
                status: { $in: ["Accepted", "Confirmed"] }
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
        if (!requestData.payment) {
            const resource = resources.find((r) => r.id === resourceId);
            requestData.payment = {
                status: "Pending",
                transactionId: null,
                amount: (resource && resource.rate) || 0,
                paidAt: null,
                refundedAt: null
            };
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

        const allowedStatuses = [
            "Accepted",
            "Rejected",
            "Counter-Offered",
            "Confirmed",
            "Completed",
            "Cancelled"
        ];
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

        // Optional actor resolution from auth token
        let authUser = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    authUser = await User.findById(decoded.id);
                }
            } catch (authErr) {
                // Ignore token error for unauthenticated calls
            }
        }

        if (status === "Counter-Offered" && existingRequest.status !== "Pending") {
            return res.status(400).json({ error: "Only Pending requests can be counter-offered" });
        }

        // Terminal states cannot transition further (Rules 8 & 9)
        if (["Rejected", "Cancelled", "Completed"].includes(existingRequest.status)) {
            return res.status(400).json({
                error: `Cannot modify a request that is already ${existingRequest.status}`
            });
        }

        // Cancellation (Pending -> Cancelled, Accepted -> Cancelled, Confirmed -> Cancelled)
        if (status === "Cancelled") {
            if (!["Pending", "Accepted", "Confirmed"].includes(existingRequest.status)) {
                return res.status(400).json({
                    error: `Cannot cancel a request that is currently ${existingRequest.status}`
                });
            }

            if (authUser && (existingRequest.seeker || existingRequest.provider)) {
                const isSeeker = (existingRequest.seeker && existingRequest.seeker.toString() === authUser._id.toString()) ||
                    (authUser.businessProfile?.businessName && authUser.businessProfile.businessName.toLowerCase() === existingRequest.businessName?.toLowerCase());
                const isProvider = (existingRequest.provider && existingRequest.provider.toString() === authUser._id.toString()) ||
                    (authUser.role === "provider" || authUser.role === "both");

                if (!isSeeker && !isProvider) {
                    return res.status(403).json({ error: "Not authorized to cancel this booking." });
                }
            }

            existingRequest.status = "Cancelled";
            if (typeof providerNotes === "string") {
                existingRequest.providerNotes = providerNotes.trim();
            }
            const updatedRequest = await existingRequest.save();

            try {
                const resource = resources.find((r) => r.id === updatedRequest.resourceId);
                const hostBusiness = (resource && resource.hostBusiness) || "The resource provider";
                const seekerRecipient = updatedRequest.businessName || updatedRequest.fullName || "Requesting Business";
                const resTitle = updatedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

                let recipient = hostBusiness;
                let recipientRole = "provider";
                if (authUser && existingRequest.provider && authUser._id && existingRequest.provider.toString() === authUser._id.toString()) {
                    recipient = seekerRecipient;
                    recipientRole = "seeker";
                }

                const notification = new Notification({
                    recipient,
                    recipientRole,
                    title: "Booking Cancelled",
                    message: `The booking for ${resTitle} on ${updatedRequest.requestedDate} has been cancelled.`,
                    requestId: updatedRequest._id.toString(),
                    resourceTitle: resTitle
                });
                await notification.save();
            } catch (notifErr) {
                console.error("Failed to create cancellation notification:", notifErr);
            }

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
                    status: { $in: ["Accepted", "Confirmed"] }
                });

                if (conflictingAccepted.length > 0) {
                    return res.status(409).json({
                        error: "Conflict",
                        reason: "The proposed date is no longer available for this resource."
                    });
                }

                existingRequest.status = "Accepted";
                existingRequest.requestedDate = proposedDate;
                if (typeof providerNotes === "string") {
                    existingRequest.providerNotes = providerNotes.trim();
                }
                const updatedRequest = await existingRequest.save();
                return res.json(updatedRequest);
            }

            if (status === "Rejected") {
                existingRequest.status = "Rejected";
                if (typeof providerNotes === "string") {
                    existingRequest.providerNotes = providerNotes.trim();
                }
                const updatedRequest = await existingRequest.save();
                return res.json(updatedRequest);
            }

            return res.status(400).json({
                error: "Invalid status transition for Counter-Offered request. Only Accepted or Rejected is allowed."
            });
        }

        // Accepted -> Confirmed (Rule 3, 4, 5)
        if (existingRequest.status === "Accepted") {
            if (status !== "Confirmed") {
                return res.status(400).json({
                    error: `Cannot modify a request that is already Accepted to ${status}. Only Confirmed or Cancelled are allowed.`
                });
            }

            if (authUser && existingRequest.seeker) {
                const isSeeker = (existingRequest.seeker.toString() === authUser._id.toString()) ||
                    (authUser.businessProfile?.businessName && authUser.businessProfile.businessName.toLowerCase() === existingRequest.businessName?.toLowerCase());
                if (!isSeeker) {
                    return res.status(403).json({ error: "Only the seeker can confirm this booking." });
                }
            }

            const resource = resources.find((r) => r.id === existingRequest.resourceId);
            if (resource) {
                const availResult = checkResourceAvailability(resource, existingRequest.requestedDate);
                if (!availResult.available) {
                    return res.status(409).json({
                        error: "Conflict",
                        reason: availResult.reason || "The resource is no longer available on this date."
                    });
                }
            }

            const conflicting = await Request.find({
                _id: { $ne: id },
                resourceId: existingRequest.resourceId,
                requestedDate: existingRequest.requestedDate,
                status: { $in: ["Accepted", "Confirmed"] }
            });

            if (conflicting.length > 0) {
                return res.status(409).json({
                    error: "Conflict",
                    reason: "Cannot confirm booking: resource is already booked for this date."
                });
            }

            existingRequest.status = "Confirmed";
            if (typeof providerNotes === "string") {
                existingRequest.providerNotes = providerNotes.trim();
            }
            const updatedRequest = await existingRequest.save();

            try {
                const hostBusiness = (resource && resource.hostBusiness) || "The resource provider";
                const seekerRecipient = updatedRequest.businessName || updatedRequest.fullName || "Requesting Business";
                const resTitle = updatedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

                const notification = new Notification({
                    recipient: hostBusiness,
                    recipientRole: "provider",
                    title: "Booking Confirmed",
                    message: `${seekerRecipient} has confirmed the booking for ${resTitle} on ${updatedRequest.requestedDate}.`,
                    requestId: updatedRequest._id.toString(),
                    resourceTitle: resTitle
                });
                await notification.save();
            } catch (notifErr) {
                console.error("Failed to create provider notification:", notifErr);
            }

            return res.json(updatedRequest);
        }

        // Confirmed -> Completed (Rule 7, 9)
        if (existingRequest.status === "Confirmed") {
            if (status !== "Completed") {
                return res.status(400).json({
                    error: `Cannot modify a Confirmed booking to ${status}. Only Completed or Cancelled are allowed.`
                });
            }

            const dateParts = parseDateParts(existingRequest.requestedDate);
            if (dateParts) {
                const now = new Date();
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const targetMidnight = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
                if (targetMidnight >= todayMidnight) {
                    return res.status(400).json({
                        error: "Booking can only be marked as completed after the requested booking date has passed."
                    });
                }
            }

            existingRequest.status = "Completed";
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
                    title: "Booking Completed",
                    message: `Your booking for ${resTitle} on ${updatedRequest.requestedDate} has been marked as completed.`,
                    requestId: updatedRequest._id.toString(),
                    resourceTitle: resTitle
                });
                await notification.save();
            } catch (notifErr) {
                console.error("Failed to create seeker notification:", notifErr);
            }

            return res.json(updatedRequest);
        }

        // Pending transitions
        if (status === "Confirmed" || status === "Completed") {
            return res.status(400).json({
                error: `Invalid status transition: Pending requests cannot be transitioned directly to ${status}`
            });
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
                status: { $in: ["Accepted", "Confirmed"] }
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

        if (status === "Accepted") {
            const otherAccepted = await Request.find({
                _id: { $ne: id },
                resourceId: existingRequest.resourceId,
                requestedDate: existingRequest.requestedDate,
                status: { $in: ["Accepted", "Confirmed"] }
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

// Phase 14.2 — Mock Payment for Confirmed Bookings
const handleMockPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const existingRequest = await Request.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Rule 1 & 7: Payment applies only to a Confirmed booking.
        if (existingRequest.status !== "Confirmed") {
            return res.status(400).json({
                error: `Payment can only be made for Confirmed bookings. Current booking status is ${existingRequest.status}.`
            });
        }

        // Rule 5: Payment must not be created twice for the same booking.
        if (existingRequest.payment && existingRequest.payment.status === "Paid") {
            return res.status(400).json({
                error: "Duplicate payment rejected: this booking has already been paid."
            });
        }

        if (existingRequest.payment && existingRequest.payment.status === "Refunded") {
            return res.status(400).json({
                error: "Cannot pay for a refunded booking."
            });
        }

        // Rule 6: Only the authorized seeker can make the payment.
        let authUser = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    authUser = { _id: decoded.id };
                    try {
                        const foundUser = await User.findById(decoded.id);
                        if (foundUser) authUser = foundUser;
                    } catch (uErr) {}
                }
            } catch (authErr) {
                return res.status(401).json({ error: "Invalid or expired token" });
            }
        }

        if (existingRequest.seeker) {
            if (!authUser) {
                return res.status(401).json({ error: "Authentication required to pay for this booking." });
            }
            const isSeeker = (authUser._id && existingRequest.seeker.toString() === authUser._id.toString()) ||
                (authUser.businessProfile?.businessName && authUser.businessProfile.businessName.toLowerCase() === existingRequest.businessName?.toLowerCase());
            if (!isSeeker) {
                return res.status(403).json({ error: "Unauthorized: only the seeker who created the booking can make the payment." });
            }
        } else if (authUser) {
            if ((existingRequest.provider && authUser._id && existingRequest.provider.toString() === authUser._id.toString()) || authUser.role === "provider") {
                return res.status(403).json({ error: "Unauthorized: providers cannot make payments for bookings." });
            }
        }

        // Rule 4: Amount should come from existing request/resource pricing data.
        const resource = resources.find((r) => r.id === existingRequest.resourceId);
        let amount = existingRequest.price || (existingRequest.payment && existingRequest.payment.amount) || (resource ? resource.rate : 0);
        if (req.body && typeof req.body.amount === "number" && req.body.amount > 0) {
            amount = req.body.amount;
        }
        if (!amount || amount <= 0) {
            amount = 1000;
        }

        // Rule 3: Generate payment status, transaction ID, payment date, amount
        const transactionId = "TXN-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const paidAt = new Date();

        existingRequest.payment = {
            status: "Paid",
            transactionId,
            amount,
            paidAt,
            refundedAt: null
        };

        const updatedRequest = await existingRequest.save();

        // Rule 11: Add notification for successful payment
        try {
            const hostBusiness = (resource && resource.hostBusiness) || "The resource provider";
            const seekerRecipient = updatedRequest.businessName || updatedRequest.fullName || "Requesting Business";
            const resTitle = updatedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

            const notification = new Notification({
                recipient: hostBusiness,
                recipientRole: "provider",
                title: "Payment Received",
                message: `${seekerRecipient} has completed payment of ₹${amount} for ${resTitle} on ${updatedRequest.requestedDate}. (Transaction: ${transactionId})`,
                requestId: updatedRequest._id.toString(),
                resourceTitle: resTitle
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to create payment notification:", notifErr);
        }

        res.json(updatedRequest);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ error: "Request not found" });
        }
        console.error("Failed to process mock payment:", error);
        res.status(500).json({ error: "Failed to process mock payment" });
    }
};

app.post("/api/requests/:id/pay", handleMockPayment);
app.post("/api/requests/:id/payment", handleMockPayment);

// Phase 14.2 — Mock Refund for Eligible Paid & Cancelled Bookings
const handleMockRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const existingRequest = await Request.findById(id);
        if (!existingRequest) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Rule 8: Add a mock Refund action for an eligible Paid booking that has been Cancelled.
        if (existingRequest.status !== "Cancelled") {
            return res.status(400).json({
                error: `Refund is only available for Cancelled bookings. Current booking status is ${existingRequest.status}.`
            });
        }

        if (!existingRequest.payment || existingRequest.payment.status !== "Paid") {
            if (existingRequest.payment && existingRequest.payment.status === "Refunded") {
                return res.status(400).json({
                    error: "Duplicate refund rejected: this payment has already been refunded."
                });
            }
            return res.status(400).json({
                error: "Cannot refund: booking has not been paid."
            });
        }

        // Authorization check if user is authenticated
        let authUser = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    authUser = { _id: decoded.id };
                    try {
                        const foundUser = await User.findById(decoded.id);
                        if (foundUser) authUser = foundUser;
                    } catch (uErr) {}
                }
            } catch (authErr) {
                return res.status(401).json({ error: "Invalid or expired token" });
            }
        }

        if (existingRequest.seeker) {
            if (!authUser) {
                return res.status(401).json({ error: "Authentication required to request a refund." });
            }
            const isSeeker = (authUser._id && existingRequest.seeker.toString() === authUser._id.toString()) ||
                (authUser.businessProfile?.businessName && authUser.businessProfile.businessName.toLowerCase() === existingRequest.businessName?.toLowerCase());
            if (!isSeeker) {
                return res.status(403).json({ error: "Unauthorized: only the seeker who created the booking can initiate a refund." });
            }
        } else if (authUser) {
            if ((existingRequest.provider && authUser._id && existingRequest.provider.toString() === authUser._id.toString()) || authUser.role === "provider") {
                return res.status(403).json({ error: "Unauthorized: providers cannot initiate refunds." });
            }
        }

        // Rule 9: Refund changes status to Refunded and preserves the transaction ID.
        const originalTransactionId = existingRequest.payment.transactionId;
        existingRequest.payment.status = "Refunded";
        existingRequest.payment.refundedAt = new Date();

        const updatedRequest = await existingRequest.save();

        // Rule 11: Add notification for refund
        try {
            const resource = resources.find((r) => r.id === updatedRequest.resourceId);
            const seekerRecipient = updatedRequest.businessName || updatedRequest.fullName || "Requesting Business";
            const resTitle = updatedRequest.resourceTitle || (resource && resource.title) || "Hospitality Resource";

            const notification = new Notification({
                recipient: seekerRecipient,
                recipientRole: "seeker",
                title: "Payment Refunded",
                message: `A refund of ₹${updatedRequest.payment.amount} has been processed for your cancelled booking of ${resTitle}. (Transaction: ${originalTransactionId})`,
                requestId: updatedRequest._id.toString(),
                resourceTitle: resTitle
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to create refund notification:", notifErr);
        }

        res.json(updatedRequest);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ error: "Request not found" });
        }
        console.error("Failed to process mock refund:", error);
        res.status(500).json({ error: "Failed to process mock refund" });
    }
};

app.post("/api/requests/:id/refund", handleMockRefund);
app.post("/api/requests/:id/payment/refund", handleMockRefund);

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

// Admin Analytics Endpoint (Phase 15.1)
app.get("/api/admin/analytics", protect, authorize("admin"), async (req, res) => {
    try {
        const query = Request.find();
        let allRequests = typeof query.sort === "function" ? await query.sort({ createdAt: -1 }) : await query;
        if (!Array.isArray(allRequests)) {
            allRequests = [];
        }

        // Overview metrics
        const totalResources = Array.isArray(resources) ? resources.length : 0;
        const availableResources = Array.isArray(resources)
            ? resources.filter((r) => !r.schedule || r.schedule.status === "Available").length
            : 0;

        const totalRequests = allRequests.length;
        const pendingRequests = allRequests.filter((r) => r.status === "Pending").length;
        const acceptedRequests = allRequests.filter((r) => r.status === "Accepted").length;
        const confirmedBookings = allRequests.filter((r) => r.status === "Confirmed").length;
        const completedBookings = allRequests.filter((r) => r.status === "Completed").length;
        const cancelledBookings = allRequests.filter((r) => r.status === "Cancelled").length;

        // Payment calculations
        let totalPaidRevenue = 0;
        let totalRefundedAmount = 0;

        for (const reqItem of allRequests) {
            const pStatus = reqItem.payment?.status;
            const pAmount = Number(reqItem.payment?.amount) || 0;
            if (pStatus === "Paid") {
                totalPaidRevenue += pAmount;
            } else if (pStatus === "Refunded") {
                totalRefundedAmount += pAmount;
            }
        }

        const netRevenue = Math.max(0, totalPaidRevenue - totalRefundedAmount);

        const overview = {
            totalResources,
            availableResources,
            totalRequests,
            pendingRequests,
            acceptedRequests,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            totalPaidRevenue,
            totalRefundedAmount,
            netRevenue
        };

        // Aggregated trends: requests by status
        const allStatuses = [
            "Pending",
            "Accepted",
            "Confirmed",
            "Completed",
            "Cancelled",
            "Rejected",
            "Counter-Offered"
        ];
        const requestsByStatus = allStatuses.map((st) => {
            const count = allRequests.filter((r) => r.status === st).length;
            const percentage = totalRequests > 0 ? Number(((count / totalRequests) * 100).toFixed(1)) : 0;
            return {
                status: st,
                count,
                percentage
            };
        });

        // Aggregated trends: bookings by status
        const bookingStatuses = ["Confirmed", "Completed", "Cancelled"];
        const bookingsByStatus = bookingStatuses.map((st) => ({
            status: st,
            count: allRequests.filter((r) => r.status === st).length
        }));

        // Monthly booking activity
        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        const monthMap = new Map();

        for (const reqItem of allRequests) {
            let monthKey = "";
            if (reqItem.requestedDate && /^\d{4}-\d{2}/.test(reqItem.requestedDate)) {
                monthKey = reqItem.requestedDate.substring(0, 7);
            } else if (reqItem.createdAt) {
                const dateObj = new Date(reqItem.createdAt);
                if (!isNaN(dateObj.getTime())) {
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
                    monthKey = `${y}-${m}`;
                }
            }

            if (!monthKey) {
                monthKey = "Unknown";
            }

            if (!monthMap.has(monthKey)) {
                let label = monthKey;
                if (/^\d{4}-\d{2}$/.test(monthKey)) {
                    const [y, m] = monthKey.split("-");
                    const mIdx = parseInt(m, 10) - 1;
                    label = `${monthNames[mIdx] || m} ${y}`;
                }
                monthMap.set(monthKey, {
                    month: monthKey,
                    label,
                    requests: 0,
                    bookings: 0,
                    revenue: 0
                });
            }

            const monthEntry = monthMap.get(monthKey);
            monthEntry.requests += 1;
            if (reqItem.status === "Confirmed" || reqItem.status === "Completed") {
                monthEntry.bookings += 1;
            }
            if (reqItem.payment?.status === "Paid") {
                monthEntry.revenue += Number(reqItem.payment?.amount) || 0;
            }
        }

        const monthlyBookings = Array.from(monthMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
        );

        // Resource utilization calculation
        const resourceUtilization = (Array.isArray(resources) ? resources : []).map((resItem) => {
            const matchedRequests = allRequests.filter(
                (r) => r.resourceId === resItem.id || r.resourceId === String(resItem.id)
            );
            const reqCount = matchedRequests.length;
            const confirmedCount = matchedRequests.filter((r) => r.status === "Confirmed").length;
            const completedCount = matchedRequests.filter((r) => r.status === "Completed").length;
            const bookingCount = confirmedCount + completedCount;
            const utilizationPercentage =
                reqCount > 0 ? Number(((bookingCount / reqCount) * 100).toFixed(1)) : 0;

            const resRevenue = matchedRequests.reduce((sum, r) => {
                if (r.payment?.status === "Paid") {
                    return sum + (Number(r.payment?.amount) || 0);
                }
                return sum;
            }, 0);

            return {
                resourceId: resItem.id,
                title: resItem.title,
                category: resItem.category,
                hostBusiness: resItem.hostBusiness,
                rate: resItem.rate,
                rateUnit: resItem.rateUnit,
                totalRequests: reqCount,
                confirmedBookings: confirmedCount,
                completedBookings: completedCount,
                bookingCount,
                utilizationPercentage,
                revenue: resRevenue
            };
        });

        // Recent activity (latest 10 requests)
        const recentActivity = allRequests.slice(0, 10).map((r) => ({
            id: r._id ? r._id.toString() : (r.id || ""),
            resource: {
                id: r.resourceId,
                title: r.resourceTitle || "Hospitality Resource"
            },
            seeker: {
                name: r.fullName || "Seeker",
                businessName: r.businessName || "",
                email: r.email || ""
            },
            status: r.status,
            date: r.requestedDate,
            payment: {
                status: r.payment?.status || "Pending",
                amount: Number(r.payment?.amount) || 0,
                transactionId: r.payment?.transactionId || null
            },
            createdAt: r.createdAt || null
        }));

        res.json({
            overview,
            requestsByStatus,
            bookingsByStatus,
            monthlyBookings,
            resourceUtilization,
            recentActivity
        });
    } catch (error) {
        console.error("Failed to fetch admin analytics:", error);
        res.status(500).json({ error: "Failed to fetch marketplace analytics" });
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

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Request = require("./models/Request");
const Booking = require("./models/Booking");
const Transaction = require("./models/Transaction");
const resources = require("./data/resources");
const { hasTimeOverlap } = require("./utils/conflict");
const { calculatePricing } = require("./utils/pricing");

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

function generateBookingNumber() {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BK-${year}-${randomHex}`;
}

app.post("/api/requests/:id/confirm", async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate request ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid request ID format" });
        }

        const request = await Request.findById(id);
        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        // 2. Check request status
        if (request.status !== "Accepted") {
            return res.status(400).json({
                error: "Invalid request status",
                reason: "Only accepted requests can be confirmed"
            });
        }

        // 3. Check duplicate confirmation
        if (request.bookingId) {
            return res.status(409).json({
                error: "Conflict",
                reason: "This request has already been confirmed and has an existing booking."
            });
        }

        const existingBookingForRequest = await Booking.findOne({ requestId: id });
        if (existingBookingForRequest) {
            request.bookingId = existingBookingForRequest._id;
            await request.save();
            return res.status(409).json({
                error: "Conflict",
                reason: "This request has already been confirmed and has an existing booking."
            });
        }

        // 4. Find the resource
        const resource = resources.find((r) => r.id === request.resourceId);
        if (!resource) {
            return res.status(404).json({ error: "Resource not found" });
        }

        // 5. Calculate pricing
        const pricing = calculatePricing(resource, request);
        if (!pricing.valid) {
            return res.status(400).json({
                error: "Pricing calculation failed",
                reason: pricing.error
            });
        }

        // 6. Check conflicts before creating the Booking
        // A. Existing Accepted Requests (excluding current request)
        const otherAccepted = await Request.find({
            _id: { $ne: id },
            resourceId: request.resourceId,
            requestedDate: request.requestedDate,
            status: "Accepted"
        });

        const requestConflict = otherAccepted.find((r) =>
            hasTimeOverlap(request.startTime, request.endTime, r.startTime, r.endTime)
        );

        if (requestConflict) {
            return res.status(409).json({
                error: "Conflict",
                reason: "Cannot confirm booking: overlaps with another accepted request."
            });
        }

        // B. Existing active Bookings (Confirmed and Active block; Cancelled and Completed do not)
        const activeBookings = await Booking.find({
            resourceId: request.resourceId,
            requestedDate: request.requestedDate,
            status: { $in: ["Confirmed", "Active"] }
        });

        const bookingConflict = activeBookings.find((b) =>
            String(b.requestId) !== String(id) &&
            hasTimeOverlap(request.startTime, request.endTime, b.startTime, b.endTime)
        );

        if (bookingConflict) {
            return res.status(409).json({
                error: "Conflict",
                reason: "Cannot confirm booking: overlaps with an existing confirmed booking."
            });
        }

        // 7. Create the Booking
        let bookingNumber = generateBookingNumber();
        const existingBookingNumber = await Booking.findOne({ bookingNumber });
        if (existingBookingNumber) {
            bookingNumber = generateBookingNumber();
        }

        const booking = new Booking({
            bookingNumber,
            requestId: request._id,
            resourceId: request.resourceId,
            resourceTitle: request.resourceTitle || resource.title,
            hostBusiness: resource.hostBusiness || "Host Business",
            seekerBusiness: request.businessName,
            seekerFullName: request.fullName,
            seekerEmail: request.email,
            seekerPhone: request.phone,
            requestedDate: request.requestedDate,
            startTime: request.startTime,
            endTime: request.endTime,
            rate: pricing.rate,
            rateUnit: pricing.rateUnit,
            duration: pricing.duration.hours,
            billedUnits: pricing.billedUnits,
            subtotal: pricing.subtotal,
            total: pricing.total,
            currency: pricing.currency,
            status: "Confirmed"
        });

        let savedBooking;
        try {
            savedBooking = await booking.save();
        } catch (bookingSaveError) {
            console.error("Failed to save booking:", bookingSaveError);
            return res.status(500).json({ error: "Failed to create booking" });
        }

        // 8. Link the Request to the Booking
        try {
            request.bookingId = savedBooking._id;
            await request.save();
        } catch (requestUpdateError) {
            console.error("Failed to update request with bookingId:", requestUpdateError);
            return res.status(500).json({
                error: "Booking created but failed to link to request"
            });
        }

        // 9. Response
        return res.status(201).json({
            success: true,
            booking: savedBooking,
            pricing: {
                rate: pricing.rate,
                rateUnit: pricing.rateUnit,
                duration: pricing.duration,
                billedUnits: pricing.billedUnits,
                subtotal: pricing.subtotal,
                total: pricing.total,
                currency: pricing.currency
            }
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid request ID format" });
        }
        console.error("Failed to confirm booking:", error);
        return res.status(500).json({ error: "Failed to confirm booking" });
    }
});

function generateTransactionNumber() {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TXN-${year}-${randomHex}`;
}

function generateMockGatewayRef() {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MOCK-${year}-${randomHex}`;
}

app.post("/api/bookings/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate booking ID format
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid booking ID format" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // 2. Validate Booking status (only Confirmed allowed)
        if (booking.status !== "Confirmed") {
            return res.status(400).json({
                error: "Invalid booking status",
                reason: `Payment is only allowed for Confirmed bookings. Current status is ${booking.status}.`
            });
        }

        // 3. Validate payment request body
        const { paymentMethod } = req.body || {};
        const SUPPORTED_PAYMENT_METHODS = ["UPI", "Card", "NetBanking"];
        const normalizedMethod = typeof paymentMethod === "string"
            ? SUPPORTED_PAYMENT_METHODS.find((m) => m.toLowerCase() === paymentMethod.trim().toLowerCase())
            : null;

        if (!normalizedMethod) {
            return res.status(400).json({
                error: "Invalid or missing payment method",
                reason: `Supported payment methods are: ${SUPPORTED_PAYMENT_METHODS.join(", ")}`
            });
        }

        // 4. Duplicate payment protection
        const existingCharge = await Transaction.findOne({
            bookingId: id,
            type: "Charge",
            status: "Success"
        });

        if (existingCharge) {
            return res.status(409).json({
                error: "Conflict",
                reason: "This booking has already been paid."
            });
        }

        // 5. Generate transaction number & mock gateway ref
        let transactionNumber = generateTransactionNumber();
        const existingTxnNum = await Transaction.findOne({ transactionNumber });
        if (existingTxnNum) {
            transactionNumber = generateTransactionNumber();
        }

        const gatewayRef = generateMockGatewayRef();

        // 6. Create Transaction
        const transaction = new Transaction({
            transactionNumber,
            bookingId: booking._id,
            type: "Charge",
            amount: booking.total,
            currency: booking.currency,
            status: "Success",
            paymentMethod: normalizedMethod,
            gatewayRef
        });

        const savedTransaction = await transaction.save();

        // 7. Response (Booking remains Confirmed)
        return res.status(201).json({
            success: true,
            message: "Payment simulated successfully",
            transaction: savedTransaction,
            booking
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid booking ID format" });
        }
        console.error("Failed to process simulated payment:", error);
        return res.status(500).json({ error: "Failed to process payment" });
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


const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true
    },
    resourceId: {
      type: String,
      required: true,
      trim: true
    },
    resourceTitle: {
      type: String,
      required: true,
      trim: true
    },
    hostBusiness: {
      type: String,
      required: true,
      trim: true
    },
    seekerBusiness: {
      type: String,
      required: true,
      trim: true
    },
    seekerFullName: {
      type: String,
      required: true,
      trim: true
    },
    seekerEmail: {
      type: String,
      required: true,
      trim: true
    },
    seekerPhone: {
      type: String,
      required: true,
      trim: true
    },
    requestedDate: {
      type: String,
      required: true,
      trim: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    rateUnit: {
      type: String,
      required: true,
      enum: ["hour", "day"],
      trim: true
    },
    duration: {
      type: Number,
      required: true,
      min: 0
    },
    billedUnits: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: ["Confirmed", "Active", "Completed", "Cancelled"],
      default: "Confirmed"
    },
    // Optional Phase 12 identity compatibility fields (unauthenticated for now)
    seekerUserId: {
      type: String,
      default: null
    },
    hostBusinessId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

module.exports = Booking;

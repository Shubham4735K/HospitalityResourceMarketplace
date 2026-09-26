const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    // Ownership — added in Phase 12.4.
    // Both fields are optional at the schema level to preserve backward
    // compatibility with legacy requests that were created before authentication
    // was introduced (Phase 12). Legacy documents that lack these fields are
    // simply excluded from ownership-scoped queries.
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Resource identity — unchanged from Phase 6/7.
    resourceId: {
      type: String,
      required: true
    },
    resourceTitle: {
      type: String,
      required: true
    },

    // Contact snapshot — unchanged from Phase 6/7.
    fullName: {
      type: String,
      required: true
    },
    businessName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },

    // Scheduling — unchanged from Phase 6/7.
    requestedDate: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },

    // Optional free-text message — unchanged from Phase 6/7.
    message: {
      type: String
    },

    // Lifecycle status — unchanged from Phase 7.
    status: {
      type: String,
      enum: {
        values: ["Pending", "Accepted", "Rejected"],
        message: "Status must be Pending, Accepted, or Rejected"
      },
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

// Index for ownership-scoped lookups added in Phase 12.4.
requestSchema.index({ seeker: 1 });
requestSchema.index({ provider: 1 });

const Request = mongoose.model("Request", requestSchema);

module.exports = Request;

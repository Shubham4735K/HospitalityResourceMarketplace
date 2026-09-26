const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true
    },
    actorId: {
      type: String,
      default: "system",
      index: true
    },
    actorEmail: {
      type: String,
      default: ""
    },
    actorRole: {
      type: String,
      default: ""
    },
    targetType: {
      type: String,
      required: true,
      enum: ["User", "Resource", "Booking", "Payment", "System"],
      index: true
    },
    targetId: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    bufferCommands: false
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

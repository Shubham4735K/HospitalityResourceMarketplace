const mongoose = require("mongoose");

const roleChangeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    requesterName: {
      type: String,
      default: "",
      trim: true
    },
    requesterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    currentRole: {
      type: String,
      required: true,
      enum: ["seeker", "provider", "both", "admin"]
    },
    requestedRole: {
      type: String,
      required: true,
      enum: ["seeker", "provider", "both"]
    },
    reason: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

roleChangeRequestSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  }
});

const RoleChangeRequest = mongoose.model("RoleChangeRequest", roleChangeRequestSchema);

module.exports = RoleChangeRequest;

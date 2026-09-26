const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
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
    resourceId: {
      type: String,
      required: true
    },
    resourceTitle: {
      type: String,
      required: true
    },
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
    message: {
      type: String
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Rejected",
        "Counter-Offered",
        "Confirmed",
        "Completed",
        "Cancelled"
      ],
      default: "Pending"
    },
    providerNotes: {
      type: String,
      default: ""
    },
    counterProposal: {
      date: {
        type: String
      },
      notes: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

requestSchema.index({ seeker: 1 });
requestSchema.index({ provider: 1 });

const Request = mongoose.model("Request", requestSchema);

module.exports = Request;
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
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
    }
  },
  {
    timestamps: true
  }
);

const Request = mongoose.model("Request", requestSchema);

module.exports = Request;

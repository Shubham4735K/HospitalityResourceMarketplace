const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true
    },
    recipientRole: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    requestId: {
      type: String,
      required: true
    },
    resourceTitle: {
      type: String
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    bufferCommands: false
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

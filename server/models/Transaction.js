const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ["Charge", "Deposit", "Refund", "Payout"]
    },
    amount: {
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
      enum: ["Pending", "Success", "Failed", "Refunded"],
      default: "Pending"
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true
    },
    gatewayRef: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;

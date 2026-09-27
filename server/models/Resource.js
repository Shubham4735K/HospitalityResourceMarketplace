const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Commercial Kitchen & Prep",
        "Venues & Spaces",
        "Commercial Equipment",
        "Event Supplies & Decor"
      ]
    },
    hostBusiness: {
      type: String,
      default: "Resource Provider",
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    rate: {
      type: Number,
      required: true,
      min: 1
    },
    rateUnit: {
      type: String,
      enum: ["hour", "day"],
      default: "hour"
    },
    availability: {
      type: String,
      default: "Daily, Available on request",
      trim: true
    },
    schedule: {
      status: {
        type: String,
        enum: ["Available", "Unavailable"],
        default: "Available"
      },
      type: {
        type: String,
        default: "recurring"
      },
      availableDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5, 6, 7]
      },
      blackoutDates: {
        type: [String],
        default: []
      }
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    specs: {
      type: [String],
      default: []
    },
    image: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80"
    },
    houseRules: {
      type: [String],
      default: []
    },
    verified: {
      type: Boolean,
      default: true
    },
    disabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

const Resource = mongoose.model("Resource", resourceSchema);

module.exports = Resource;

const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI or MONGO_URI environment variable is not defined");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected successfully");
};

module.exports = connectDB;

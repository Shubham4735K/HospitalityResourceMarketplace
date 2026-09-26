require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const resources = require("./data/resources");
const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests"); // Phase 12.4

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes (Phase 12.3)
app.use("/api/auth", authRoutes);

// Request routes (Phase 12.4 — ownership-secured)
app.use("/api/requests", requestRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "ResShare backend is running"
    });
});

app.get("/api/resources", (req, res) => {
    res.json(resources);
});

if (require.main === module) {
    connectDB().catch((err) => {
        console.error("MongoDB connection failed:", err.message);
    });

    app.listen(5000, () => {
        console.log("ResShare backend is running on port 5000");
    });
}

module.exports = app;
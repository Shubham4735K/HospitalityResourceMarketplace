const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Request = require("./models/Request");
const resources = require("./data/resources");

const requests = [];

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "ResShare backend is running"
    });
});

app.get("/api/resources", (req, res) => {
    res.json(resources);
});

app.post("/api/requests", async (req, res) => {
    try {
        const request = new Request(req.body);
        const savedRequest = await request.save();
        res.status(201).json(savedRequest);
    } catch (error) {
        res.status(500).json({ error: "Failed to create request" });
    }
});

app.get("/api/requests", async (req, res) => {
    try {
        const allRequests = await Request.find();
        res.json(allRequests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

connectDB().catch((err) => {
    console.error("MongoDB connection failed:", err.message);
});

app.listen(5000, () => {
    console.log("ResShare backend is running on port 5000");
});

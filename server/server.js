const express = require("express");
const cors = require("cors");
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

app.post("/api/requests", (req, res) => {
    const request = req.body;
    requests.push(request);
    res.status(201).json(request);
});

app.listen(5000, () => {
    console.log("ResShare backend is running on port 5000");
});
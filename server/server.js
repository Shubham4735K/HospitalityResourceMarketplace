const express = require("express");
const resources = require("./data/resources");

const app = express();

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "ResShare backend is running"
    });
});

app.get("/api/resources", (req, res) => {
    res.json(resources);
});

app.listen(5000, () => {
    console.log("ResShare backend is running on port 5000");
});
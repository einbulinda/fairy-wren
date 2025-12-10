const express = require("express");
const cors = require("cors");
const routes = require("./load/routes");

const app = express();

app.use(cors());
app.use(express.json());

// Load all routes
app.use("/api", routes);

module.exports = app;

const express = require("express");
const cors = require("cors");
const routes = require("./load/routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(errorHandler);

// Load all routes
app.use("/api", routes);

module.exports = app;

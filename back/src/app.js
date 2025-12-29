const express = require("express");
const cors = require("cors");
const routes = require("./load/routes");
const errorHandler = require("./middleware/errorHandler");
const timeout = require("connect-timeout");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin: ["https://pos.fairywren.co.ke", "https://www.pos.fairywren.co.ke"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Timeout Protection
const haltOnTimedout = (req, res, next) => {
  if (!req.timedout) next();
};

app.use(timeout("30s"));
app.use(haltOnTimedout);

// Prevent accidental root access
app.get("/", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// app.use("/api", routes); //For Development ONLY

app.use("/", routes);
app.use(haltOnTimedout);

// Error handler must be last
app.use(errorHandler);

module.exports = app;

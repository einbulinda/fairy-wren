const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./load/routes");
const errorHandler = require("./middleware/errorHandler");
const requestContext = require("./middleware/requestContext");
const requestTimer = require("./middleware/requestTimer");
const apiRateLimiter = require("./middleware/apiRateLimiter");
const timeout = require("connect-timeout");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");

const app = express();

app.set("trust proxy", 1);

// Security headers
app.use(helmet());

app.use(
  cors({
    origin: [
      "https://pos.fairywren.co.ke",
      "https://www.pos.fairywren.co.ke",
      "https://erp.fairywren.co.ke",
      "https://www.erp.fairywren.co.ke",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));

// Rate limiting
app.use(apiRateLimiter);

// Correlation ID and Request Timers
app.use(requestContext);
app.use(requestTimer);

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

// Swagger Documentation (only in non-production)
if (process.env.NODE_ENV !== "production") {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
}

app.use("/", routes);
app.use(haltOnTimedout);

// Error handler must be last
app.use(errorHandler);

module.exports = app;

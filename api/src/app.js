const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const routes = require("./load/routes");
const errorHandler = require("./middleware/errorHandler");
const requestContext = require("./middleware/requestContext");
const requestTimer = require("./middleware/requestTimer");
const apiRateLimiter = require("./middleware/apiRateLimiter");
const timeout = require("connect-timeout");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");
const { saveRawBody } = require("./utils/rawBody");
const logger = require("./utils/logger");
const { ERROR_MAP } = require("./utils/error.map");

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
      "https://fairywren.co.ke",
      "https://www.fairywren.co.ke",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb", verify: saveRawBody }));

// Serve local uploads (gallery images, event posters)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate limiting
app.use(apiRateLimiter);

// Correlation ID and Request Timers
app.use(requestContext);
app.use(requestTimer);

// Timeout Protection
//
// The 503 is sent straight from the timeout event. connect-timeout's default
// (respond: true) calls next(err) a second time for a request that is already
// in flight; when that lands in Express's built-in final handler while the
// request body is still arriving (slow upload), the final handler queues a
// write, and when the client finally drops, that write throws
// ERR_HTTP_HEADERS_SENT outside any request — an uncaught exception that
// restarts the API.
const haltOnTimedout = (req, res, next) => {
  if (!req.timedout) next();
};

app.use(timeout("30s", { respond: false }));
app.use((req, res, next) => {
  req.on("timeout", () => {
    logger.warn({
      message: "REQUEST_TIMEOUT",
      errorCode: "REQUEST_TIMEOUT",
      path: req.originalUrl,
      method: req.method,
      correlationId: req.correlationId,
      userId: req.user?.id,
      headersSent: res.headersSent,
    });
    if (res.headersSent) return;
    res.status(ERROR_MAP.REQUEST_TIMEOUT.status).json({
      success: false,
      error: { code: "REQUEST_TIMEOUT", message: ERROR_MAP.REQUEST_TIMEOUT.message },
    });
  });
  next();
});
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

// Unknown route: answer now. Express's built-in 404 waits for the whole
// request body first, which a stalled upload never delivers.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Cannot ${req.method} ${req.path}` },
  });
});

// Error handler must be last
app.use(errorHandler);

module.exports = app;

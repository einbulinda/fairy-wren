require("dotenv").config();
// Mirror console.* into the log files first, so everything after (including
// uncaught errors) is visible in ERP → System Logs.
const logger = require("./utils/logger");
logger.captureConsole();

const { createServer } = require("http");
const { validateEnv } = require("./config/env");
const app = require("./app");
const { initializeSocketServer } = require("./websocket/socket.server");
const { initializePgSubscriber, cleanupSubscriptions } = require("./websocket/pg.subscriber");

console.log("Bootstrapping FairyWren API...");

// Validate environment variables before starting
validateEnv();

const PORT = process.env.PORT || 8000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Give the file transports a moment to flush before pm2 restarts us.
  setTimeout(() => process.exit(1), 500);
});

// Create HTTP server (required for Socket.io)
const httpServer = createServer(app);

// Initialize WebSocket server
initializeSocketServer(httpServer);

// Initialize PostgreSQL real-time subscriber (LISTEN/NOTIFY)
initializePgSubscriber();

// Start reorder level scheduler
const reorderScheduler = require("./modules/inventory/services/inventory.scheduler");
reorderScheduler.start();

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  cleanupSubscriptions();
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  cleanupSubscriptions();
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT}`);
  logger.info(`WebSocket server ready`);
});

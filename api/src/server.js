require("dotenv").config();
const { validateEnv } = require("./config/env");
const app = require("./app");
const logger = require("pino")();

console.log("Bootstrapping FairyWren API...");

// Validate environment variables before starting
validateEnv();

const PORT = process.env.PORT || 8000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

app.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT}`);

  // Start reorder level scheduler
  const reorderScheduler = require("./modules/inventory/services/inventory.scheduler");
  reorderScheduler.start();
});

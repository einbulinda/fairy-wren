require("dotenv").config();
const app = require("./app");
const logger = require("pino")();

console.log("Bootstrapping FairyWren API...");

const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

app.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT}`);
});

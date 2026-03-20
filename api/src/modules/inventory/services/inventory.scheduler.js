const cron = require("node-cron");
const policiesService = require("./inventory.policies.service");

let task = null;

exports.start = () => {
  // Run daily at 2:00 AM
  task = cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[ROL] Starting daily reorder level refresh...");
      const count = await policiesService.triggerRefresh();
      console.log(`[ROL] Refresh complete. ${count} products updated.`);
    } catch (err) {
      console.error("[ROL] Refresh failed:", err.message);
    }
  });

  console.log("[ROL] Scheduler started (daily at 02:00)");
};

exports.stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

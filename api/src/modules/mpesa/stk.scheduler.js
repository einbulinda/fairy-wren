const cron = require("node-cron");
const stkService = require("./stk.service");
const logger = require("../../utils/logger");

let task = null;

/** Every minute: prompts with no answer after 3 minutes → "no response". */
exports.start = () => {
  task = cron.schedule("* * * * *", async () => {
    try {
      await stkService.expireStale();
    } catch (err) {
      logger.error("[KCB STK] Sweeper failed", { error: err.message });
    }
  });
};

exports.stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

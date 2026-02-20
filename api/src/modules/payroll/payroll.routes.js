const express = require("express");
const controller = require("./payroll.controller");

const router = express.Router();

router.get("/employees", controller.listEmployees);
router.put("/employees/:profileId", controller.upsertSalaryStructure);

router.get("/runs", controller.listRuns);
router.post("/runs", controller.processRun);
router.get("/runs/:runId", controller.getRunDetail);
router.post("/runs/:runId/pay", controller.markRunPaid);
router.post("/runs/:runId/lines/:lineId/pay", controller.markLinePaid);

module.exports = router;

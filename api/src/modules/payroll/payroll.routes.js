const express = require("express");
const controller = require("./payroll.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/employees", requireRole("manager", "owner"), controller.listEmployees);
router.put("/employees/:profileId", requireRole("manager", "owner"), controller.upsertSalaryStructure);

router.get("/runs", requireRole("manager", "owner"), controller.listRuns);
router.post("/runs", requireRole("manager", "owner"), controller.processRun);
router.get("/runs/:runId", requireRole("manager", "owner"), controller.getRunDetail);
router.post("/runs/:runId/pay", requireRole("manager", "owner"), controller.markRunPaid);
router.post("/runs/:runId/lines/:lineId/pay", requireRole("manager", "owner"), controller.markLinePaid);

module.exports = router;

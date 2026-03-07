const express = require("express");
const controller = require("./journals.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", requireRole("manager", "owner"), controller.listJournals);
router.post("/", requireRole("manager", "owner"), controller.createJournal);
router.get("/:journalId", requireRole("manager", "owner"), controller.getJournal);
router.post("/:journalId/void", requireRole("manager", "owner"), controller.voidJournal);

module.exports = router;

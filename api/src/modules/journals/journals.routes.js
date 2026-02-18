const express = require("express");
const controller = require("./journals.controller");

const router = express.Router();

router.get("/", controller.listJournals);
router.post("/", controller.createJournal);
router.get("/:journalId", controller.getJournal);
router.post("/:journalId/void", controller.voidJournal);

module.exports = router;

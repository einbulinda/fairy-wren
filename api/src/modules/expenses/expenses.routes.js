const express = require("express");
const controller = require("./expenses.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.listExpenses);
router.post("/", requireRole("manager", "owner"), controller.createExpense);

module.exports = router;

const express = require("express");
const router = express.Router();
const expenseController = require("./expenses.controller");

router.post("/", expenseController.createExpense);
router.get("/", expenseController.getExpense);

module.exports = router;

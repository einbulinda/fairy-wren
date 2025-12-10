const express = require("express");
const router = express.Router();
const expenseController = require("./expenses.controller");

router.post("/", expenseController.postExpense);
router.get("/", expenseController.getExpenses);

module.exports = router;

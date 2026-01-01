const express = require("express");
const router = express.Router();
const expenseController = require("./expenses.controller");

router.get("/", expenseController.getExpense);
router.post("/", expenseController.createExpense);


module.exports = router;

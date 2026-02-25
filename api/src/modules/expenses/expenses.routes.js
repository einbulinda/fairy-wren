const express = require("express");
const controller = require("./expenses.controller");

const router = express.Router();

router.get("/", controller.listExpenses);
router.post("/", controller.createExpense);

module.exports = router;

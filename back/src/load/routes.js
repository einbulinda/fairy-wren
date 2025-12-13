const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const billRoutes = require("../modules/bills/bills.routes");
const productRoutes = require("../modules/products/products.routes");
const reportsRoutes = require("../modules/reports/reports.routes");
const expenseRoutes = require("../modules/expenses/expenses.routes");
const userRoutes = require("../modules/users/users.routes");

router.use("/auth", authRoutes);
router.use("/bills", billRoutes);
router.use("/products", productRoutes);
router.use("/reports", reportsRoutes);
router.use("/expenses", expenseRoutes);
router.use("/users", userRoutes);

module.exports = router;

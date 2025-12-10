const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const billRoutes = require("../modules/bills/bills.routes");
const productRoutes = require("../modules/products");
const reportsRoutes = require("../modules/reports");
const expenseRoutes = require("../modules/expenses");
const userRoutes = require("../modules/users");

router.use("/auth", authRoutes);
router.use("/bills", billRoutes);
router.use("/products", productRoutes);
router.use("/reports", reportsRoutes);
router.use("/expenses", expenseRoutes);
router.use("/users", userRoutes);

module.exports = router;

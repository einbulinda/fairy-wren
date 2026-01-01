const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const authRoutes = require("../modules/auth/auth.routes");
const billRoutes = require("../modules/bills/bills.routes");
const productRoutes = require("../modules/products/products.routes");
const reportsRoutes = require("../modules/reports/reports.routes");
const expenseRoutes = require("../modules/expenses/expenses.routes");
const userRoutes = require("../modules/users/users.routes");
const categoryRoutes = require("../modules/categories/categories.routes");
const supplierRoutes = require("../modules/suppliers/suppliers.routes");
const accountsRoutes = require("../modules/accounts/accounts.routes");

// Public Routes
router.use(require("./health.routes"));
router.use("/auth", authRoutes);

// Protected Routes
router.use("/bills", authMiddleware, billRoutes);
router.use("/products", authMiddleware, productRoutes);
router.use("/reports", authMiddleware, reportsRoutes);
router.use("/expenses", authMiddleware, expenseRoutes);
router.use("/users", authMiddleware, userRoutes);
router.use("/categories", authMiddleware, categoryRoutes);
router.use("/suppliers", authMiddleware, supplierRoutes);
router.use("/accounts", authMiddleware, accountsRoutes);

module.exports = router;

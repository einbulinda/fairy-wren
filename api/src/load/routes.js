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
const inventoryRoutes = require("../modules/inventory/inventory.routes");
const paymentRoutes = require("../modules/payments/payments.routes");
const posRoutes = require("../modules/pos/pos.routes");
const journalsRoutes = require("../modules/journals/journals.routes");
const chequesRoutes = require("../modules/cheques/cheques.routes");
const payrollRoutes = require("../modules/payroll/payroll.routes");
const settingsRoutes = require("../modules/settings/settings.routes");
const accountClassRoutes = require("../modules/account-classes/account-classes.routes");
const systemRoleRoutes = require("../modules/system-roles/system-roles.routes");

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
router.use("/inventory", authMiddleware, inventoryRoutes);
router.use("/payments", authMiddleware, paymentRoutes);
router.use("/pos", authMiddleware, posRoutes);
router.use("/journals", authMiddleware, journalsRoutes);
router.use("/cheques", authMiddleware, chequesRoutes);
router.use("/payroll", authMiddleware, payrollRoutes);
router.use("/settings", authMiddleware, settingsRoutes);
router.use("/account-classes", authMiddleware, accountClassRoutes);
router.use("/system-roles", authMiddleware, systemRoleRoutes);

module.exports = router;

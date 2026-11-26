const express = require("express");
const controller = require("./mpesa.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

// Received KCB M-Pesa notifications and their allocation to bills
router.get("/transactions", requirePermission("allocate_mpesa"), controller.listTransactions);
router.get("/transactions/:id", requirePermission("allocate_mpesa"), controller.getTransaction);
router.get("/transactions/:id/suggestions", requirePermission("allocate_mpesa"), controller.getSuggestions);
router.post("/transactions/:id/allocate", requirePermission("allocate_mpesa"), controller.allocate);

// M-Pesa Express (STK Push): send a PIN prompt for a bill and follow it
// (its own permission, assigned per role under Users → System Roles)
router.get("/stk/config", requirePermission("send_mpesa_stk"), controller.getStkConfig);
router.get("/stk", requirePermission("send_mpesa_stk"), controller.listStkRequests);
router.post("/stk", requirePermission("send_mpesa_stk"), controller.initiateStk);
router.get("/stk/:id", requirePermission("send_mpesa_stk"), controller.getStkRequest);

// Who a tip can be given to (cashiers can't use /users, which is manager-only)
router.get("/staff", requirePermission("allocate_mpesa"), controller.listStaff);

// Undo a wrong match — managers only
router.post("/allocations/:id/reverse", requirePermission("manage_mpesa"), controller.reverseAllocation);

// Back office (ERP) — managers / owners
router.get("/register", requirePermission("manage_mpesa"), controller.getRegister);
router.get("/summary", requirePermission("manage_mpesa"), controller.getSummary);
router.get("/tips/payouts", requirePermission("manage_mpesa"), controller.listPayouts);
router.post("/tips/payouts", requirePermission("manage_mpesa"), controller.payTips);

module.exports = router;

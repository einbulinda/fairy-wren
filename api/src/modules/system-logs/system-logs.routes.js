const express = require("express");
const controller = require("./system-logs.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

// Production logs (requests, warnings, errors with stack traces). Logs can
// contain user ids, paths and error details, so access is owner-only unless the
// owner grants `view_system_logs`.
router.use(requirePermission("view_system_logs"));

router.get("/", controller.getEntries);              // ?date=YYYY-MM-DD&levels=error,warn&q=&since=ISO&limit=
router.get("/files", controller.listFiles);
router.get("/files/:name", controller.downloadFile); // raw file download

module.exports = router;

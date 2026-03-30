const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("./events.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", requirePermission("manage_events"), controller.create);
router.patch("/:id", requirePermission("manage_events"), controller.update);
router.delete("/:id", requirePermission("manage_events"), controller.remove);
router.post("/:id/poster", requirePermission("manage_events"), upload.single("poster"), controller.uploadPoster);

module.exports = router;

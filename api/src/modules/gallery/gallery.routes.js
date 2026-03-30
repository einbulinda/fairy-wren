const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("./gallery.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

router.get("/", controller.list);
router.post(
  "/",
  requirePermission("manage_events"),
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: "FILE_TOO_LARGE",
            message: "Image is too large. Maximum allowed size is 8 MB. Please resize or compress the image and try again.",
          });
        }
        if (err.message === "INVALID_FILE_TYPE") {
          return res.status(415).json({
            error: "INVALID_FILE_TYPE",
            message: "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
          });
        }
        return next(err);
      }
      next();
    });
  },
  controller.upload
);
router.patch("/reorder", requirePermission("manage_events"), controller.reorder);
router.patch("/:id", requirePermission("manage_events"), controller.update);
router.delete("/:id", requirePermission("manage_events"), controller.remove);

module.exports = router;

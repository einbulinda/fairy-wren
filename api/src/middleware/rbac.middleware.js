/**
 * Role-Based Access Control middleware.
 *
 * Usage:
 *   const { requireRole } = require("../middleware/rbac.middleware");
 *   router.post("/", requireRole("manager", "owner"), controller.create);
 */

const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
    }

    next();
  };

const requirePermission = (permission) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const userRole = req.user?.role;

  // Allow admins to bypass permission checks
  if (userRole === 'admin' || userRole === 'owner') {
    return next();
  }

  if (!userPermissions.includes(permission)) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      },
    });
  }

  next();
};

module.exports = { requireRole, requirePermission };

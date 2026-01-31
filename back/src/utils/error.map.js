/**
 * Maps domain error codes to HTTP status and messages
 * PURE DATA — no side effects
 */
const ERROR_MAP = {
  // ===== AUTH =====
  INVALID_CREDENTIALS: {
    status: 401,
    message: "Invalid PIN or credentials",
  },

  // ===== USERS =====
  INVALID_USER_DATA: {
    status: 400,
    message: "Invalid user data provided",
  },
  PIN_ALREADY_IN_USE: {
    status: 409,
    message: "PIN already in use",
  },
  USER_NOT_FOUND: {
    status: 404,
    message: "User not found",
  },
  USER_INACTIVE: {
    status: 403,
    message: "User account is inactive",
  },

  // ===== PRODUCTS =====
  INVALID_PRODUCT_DATA: {
    status: 400,
    message: "Invalid product data provided",
  },
  PRODUCT_NOT_FOUND: {
    status: 404,
    message: "Product not found",
  },
  FAILED_TO_CREATE_PRODUCT: {
    status: 500,
    message: "Failed to create product",
  },
  FAILED_TO_UPDATE_PRODUCT: {
    status: 500,
    message: "Failed to update product",
  },

  // ===== COMMON =====
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication required",
  },
  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to perform this action",
  },

  // ===== FALLBACK =====
  INTERNAL_ERROR: {
    status: 500,
    message: "An unexpected error occurred",
  },
};

module.exports = {
  ERROR_MAP,
};

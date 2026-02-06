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
  TOO_MANY_LOGIN_ATTEMPTS: {
    status: 429,
    message: "Too many login attempts. Please try again later.",
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

  // ===== BILLS ======
  BILL_NOT_FOUND: { status: 404, message: "Bill not found" },
  FAILED_TO_CREATE_BILL: { status: 500, message: "Failed to create bill" },
  FAILED_TO_FETCH_BILLS: { status: 500, message: "Failed to fetch bills" },
  INVALID_BILL_STATUS: { status: 400, message: "Invalid bill status" },
  FAILED_TO_UPDATE_BILL: { status: 500, message: "Failed to update bill" },

  INVALID_ROUND_DATA: { status: 400, message: "Invalid round data" },
  FAILED_TO_CREATE_ROUND: { status: 500, message: "Failed to create round" },
  FAILED_TO_ADD_ROUND_ITEMS: {
    status: 500,
    message: "Failed to add round items",
  },
  INSUFFICIENT_STOCK: {
    status: 409,
    message: "Insufficient stock for one or more items",
  },

  // ======== CATEGORIES ========
  FAILED_TO_FETCH_CATEGORIES: {
    status: 500,
    message: "Failed to fetch categories",
  },
  CATEGORY_NOT_FOUND: {
    status: 404,
    message: "Category not found",
  },
  INVALID_CATEGORY_DATA: {
    status: 400,
    message: "Invalid category data",
  },
  FAILED_TO_CREATE_CATEGORY: {
    status: 500,
    message: "Failed to create category",
  },
  FAILED_TO_UPDATE_CATEGORY: {
    status: 500,
    message: "Failed to update category",
  },
  FAILED_TO_ARCHIVE_CATEGORY: {
    status: 500,
    message: "Failed to archive category",
  },

  // ======SUPPLIERS ======
  FAILED_TO_FETCH_SUPPLIERS: {
    status: 500,
    message: "Failed to fetch suppliers",
  },
  SUPPLIER_NOT_FOUND: {
    status: 404,
    message: "Supplier not found",
  },
  INVALID_SUPPLIER_DATA: {
    status: 400,
    message: "Invalid supplier data",
  },
  FAILED_TO_CREATE_SUPPLIER: {
    status: 500,
    message: "Failed to create supplier",
  },
  FAILED_TO_UPDATE_SUPPLIER: {
    status: 500,
    message: "Failed to update supplier",
  },
  FAILED_TO_ARCHIVE_SUPPLIER: {
    status: 500,
    message: "Failed to archive supplier",
  },

  // ======================================================
  // INVENTORY
  // ======================================================
  INVALID_RESTOCK_DATA: {
    status: 400,
    message: "Invalid restock data",
  },
  FAILED_TO_FETCH_INVENTORY_STOCK: {
    status: 500,
    message: "Failed to fetch inventory stock",
  },

  /* ---------------- STOCK VISIBILITY ---------------- */

  FAILED_TO_FETCH_INVENTORY_STOCK: {
    status: 500,
    message: "Failed to fetch inventory stock",
  },

  /* ---------------- MANUAL RESTOCK ---------------- */

  INVALID_RESTOCK_DATA: {
    status: 400,
    message: "Invalid restock data provided",
  },

  PRODUCT_NOT_FOUND: {
    status: 404,
    message: "Product not found",
  },

  FAILED_TO_RESTOCK: {
    status: 500,
    message: "Failed to restock inventory",
  },

  /* ---------------- PROCUREMENT / RECEIVING ---------------- */

  SUPPLIER_REQUIRED: {
    status: 400,
    message: "Supplier is required",
  },

  INVOICE_NUMBER_REQUIRED: {
    status: 400,
    message: "Invoice number is required",
  },

  PURCHASE_DATE_REQUIRED: {
    status: 400,
    message: "Purchase date is required",
  },

  RECEIPT_ITEMS_REQUIRED: {
    status: 400,
    message: "At least one receipt item is required",
  },

  FAILED_TO_CREATE_RECEIPT: {
    status: 500,
    message: "Failed to create inventory receipt",
  },

  FAILED_TO_CREATE_RECEIPT_ITEMS: {
    status: 500,
    message: "Failed to create inventory receipt items",
  },

  /* ---------------- STOCK TAKE (RPC-BASED) ---------------- */

  STOCK_TAKE_NAME_REQUIRED: {
    status: 400,
    message: "Stock take name is required",
  },

  FAILED_TO_CREATE_STOCK_TAKE: {
    status: 500,
    message: "Failed to create stock take session",
  },

  INVALID_STOCK_TAKE_ITEM: {
    status: 400,
    message: "Invalid stock take item data",
  },

  FAILED_TO_RECORD_STOCK_TAKE_ITEM: {
    status: 500,
    message: "Failed to record stock take item",
  },

  STOCK_TAKE_ID_REQUIRED: {
    status: 400,
    message: "Stock take ID is required",
  },

  FAILED_TO_COMPLETE_STOCK_TAKE: {
    status: 500,
    message: "Failed to complete stock take",
  },

  FAILED_TO_APPROVE_STOCK_TAKE: {
    status: 500,
    message: "Failed to approve stock take",
  },

  REJECTION_REASON_REQUIRED: {
    status: 400,
    message: "Rejection reason is required",
  },

  FAILED_TO_REJECT_STOCK_TAKE: {
    status: 500,
    message: "Failed to reject stock take",
  },

  FAILED_TO_FETCH_STOCK_TAKES: {
    status: 500,
    message: "Failed to fetch stock take sessions",
  },

  FAILED_TO_FETCH_STOCK_TAKE_ITEMS: {
    status: 500,
    message: "Failed to fetch stock take items",
  },

  FAILED_TO_FETCH_STOCK_TAKE_ADJUSTMENTS: {
    status: 500,
    message: "Failed to fetch stock take adjustments",
  },

  INVALID_PAYMENT_DATA: {
    status: 400,
    message: "Invalid payment data provided",
  },

  FAILED_TO_PROCESS_PAYMENT: {
    status: 500,
    message: "Failed to process payment",
  },

  FAILED_TO_FETCH_PAYMENTS: {
    status: 500,
    message: "Failed to fetch payments",
  },

  FAILED_TO_FETCH_BILLS_WITH_PAYMENTS: {
    status: 500,
    message: "Failed to fetch bills with payments",
  },

  /* ---------------- INVENTORY LEDGER ---------------- */

  FAILED_TO_FETCH_LEDGER: {
    status: 500,
    message: "Failed to fetch inventory ledger",
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

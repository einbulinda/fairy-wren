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
  CURRENT_AND_NEW_PIN_REQUIRED: {
    status: 400,
    message: "Current PIN and new PIN are required",
  },
  PIN_TOO_SHORT: {
    status: 400,
    message: "PIN must be at least 4 digits",
  },
  INVALID_CURRENT_PIN: {
    status: 401,
    message: "Current PIN is incorrect",
  },
  FAILED_TO_UPDATE_PROFILE: {
    status: 500,
    message: "Failed to update profile",
  },
  FAILED_TO_CHANGE_PIN: {
    status: 500,
    message: "Failed to change PIN",
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

  // ===== ITEM EXCHANGE =====
  RETURNED_ITEM_REQUIRED: { status: 400, message: "Please select an item to return" },
  INVALID_RETURNED_QUANTITY: { status: 400, message: "Return quantity must be between 1 and the original ordered quantity" },
  REPLACEMENT_PRODUCT_REQUIRED: { status: 400, message: "Please select a replacement product" },
  INVALID_REPLACEMENT_QUANTITY: { status: 400, message: "Replacement quantity must be at least 1" },
  INVALID_REPLACEMENT_PRICE: { status: 400, message: "Invalid replacement product price" },
  AUTHORIZER_PIN_REQUIRED: { status: 400, message: "Authorizer PIN is required" },
  INSUFFICIENT_PERMISSIONS: { status: 403, message: "That PIN does not have the required role to authorize this action" },
  BILL_NOT_OPEN: { status: 409, message: "Exchanges can only be made on open bills" },
  ROUND_ITEM_NOT_FOUND: { status: 404, message: "Item not found on this bill" },
  ITEM_NOT_ON_THIS_BILL: { status: 400, message: "That item does not belong to this bill" },
  ITEM_ALREADY_EXCHANGED: { status: 409, message: "This item has already been exchanged" },
  ITEM_NOT_YET_POSTED: { status: 409, message: "Item has not been posted to the bill yet" },
  EXCHANGE_WINDOW_EXPIRED: { status: 409, message: "Exchange window has expired — only items from the last 6 hours can be exchanged" },
  FAILED_TO_CREATE_EXCHANGE_ROUND: { status: 500, message: "Failed to create exchange record" },
  FAILED_TO_INSERT_EXCHANGE_ITEMS: { status: 500, message: "Failed to record exchange items" },
  FAILED_TO_POST_REPLACEMENT_SALE: { status: 500, message: "Failed to post replacement item to inventory" },
  FAILED_TO_REVERSE_ITEM: { status: 500, message: "Failed to reverse inventory for returned item" },

  FAILED_TO_FETCH_STATS: { status: 500, message: "Failed to fetch bill statistics" },
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
  FAILED_TO_RECEIVE_INVENTORY: {
    status: 500,
    message: "Failed to receive inventory",
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

  /* ---------------- REORDER LEVEL POLICIES ---------------- */

  FAILED_TO_FETCH_REORDER_POLICIES: {
    status: 500,
    message: "Failed to fetch reorder policies",
  },
  FAILED_TO_SET_MANUAL_OVERRIDE: {
    status: 500,
    message: "Failed to set manual reorder level",
  },
  FAILED_TO_CLEAR_OVERRIDE: {
    status: 500,
    message: "Failed to clear reorder override",
  },
  FAILED_TO_FETCH_REORDER_SETTINGS: {
    status: 500,
    message: "Failed to fetch reorder settings",
  },
  FAILED_TO_UPDATE_REORDER_SETTINGS: {
    status: 500,
    message: "Failed to update reorder settings",
  },
  FAILED_TO_REFRESH_REORDER_LEVELS: {
    status: 500,
    message: "Failed to refresh reorder levels",
  },
  FAILED_TO_FETCH_REORDER_ALERTS: {
    status: 500,
    message: "Failed to fetch reorder alerts",
  },
  FAILED_TO_FETCH_MOVEMENT_ANALYSIS: {
    status: 500,
    message: "Failed to fetch product movement analysis",
  },
  INVALID_MOVEMENT_DAYS: {
    status: 400,
    message: "Movement threshold days must be a positive number",
  },
  /* ---------------- PRODUCT CONVERSIONS ---------------- */

  CONVERSION_PRODUCTS_REQUIRED: {
    status: 400,
    message: "Source and target products are required",
  },
  CONVERSION_SAME_PRODUCT: {
    status: 400,
    message: "Source and target must be different products",
  },
  INVALID_CONVERSION_QTY: {
    status: 400,
    message: "Conversion quantities must be greater than zero",
  },
  FAILED_TO_EXECUTE_CONVERSION: {
    status: 500,
    message: "Failed to execute product conversion",
  },
  FAILED_TO_FETCH_CONVERSIONS: {
    status: 500,
    message: "Failed to fetch conversion history",
  },
  FAILED_TO_FETCH_CONVERTIBLE_PRODUCTS: {
    status: 500,
    message: "Failed to fetch convertible products",
  },

  INVALID_REORDER_LEVEL: {
    status: 400,
    message: "Reorder level must be a non-negative number",
  },
  INVALID_SERVICE_LEVEL: {
    status: 400,
    message: "Service level must be between 0.5 and 0.999",
  },
  INVALID_LOOKBACK_DAYS: {
    status: 400,
    message: "Lookback days must be between 7 and 365",
  },
  INVALID_LEAD_TIME: {
    status: 400,
    message: "Lead time must be between 1 and 90 days",
  },

  // ===== ACCOUNTS =====
  ACCOUNT_NAME_REQUIRED: { status: 400, message: "Account name is required" },
  ACCOUNT_CODE_REQUIRED: { status: 400, message: "Account code is required" },
  ACCOUNT_CLASS_REQUIRED: { status: 400, message: "Account class is required" },
  INVALID_ACCOUNT_CLASS: { status: 400, message: "Invalid account class" },
  INVALID_NORMAL_BALANCE: { status: 400, message: "Normal balance must be debit or credit" },
  ACCOUNT_NOT_FOUND: { status: 404, message: "Account not found" },
  ACCOUNT_CODE_ALREADY_EXISTS: { status: 409, message: "Account code already exists" },
  PARENT_ACCOUNT_NOT_FOUND: { status: 404, message: "Parent account not found" },
  ACCOUNT_CANNOT_BE_ITS_OWN_PARENT: { status: 400, message: "Account cannot be its own parent" },
  ACCOUNT_HAS_CHILD_ACCOUNTS: { status: 409, message: "Cannot delete account with child accounts" },
  FAILED_TO_FETCH_ACCOUNTS: { status: 500, message: "Failed to fetch accounts" },
  FAILED_TO_FETCH_ACCOUNT: { status: 500, message: "Failed to fetch account" },
  FAILED_TO_CREATE_ACCOUNT: { status: 500, message: "Failed to create account" },
  FAILED_TO_UPDATE_ACCOUNT: { status: 500, message: "Failed to update account" },
  FAILED_TO_UPDATE_ACCOUNT_STATUS: { status: 500, message: "Failed to update account status" },
  FAILED_TO_DELETE_ACCOUNT: { status: 500, message: "Failed to delete account" },
  FAILED_TO_FETCH_CHILD_ACCOUNTS: { status: 500, message: "Failed to fetch child accounts" },
  NO_FIELDS_TO_UPDATE: { status: 400, message: "No fields to update" },

  // ===== ACCOUNT CLASSES =====
  CODE_REQUIRED: { status: 400, message: "Code is required" },
  LABEL_REQUIRED: { status: 400, message: "Label is required" },
  INVALID_CATEGORY: { status: 400, message: "Invalid category" },
  CODE_ALREADY_EXISTS: { status: 409, message: "Code already exists" },
  ACCOUNT_CLASS_NOT_FOUND: { status: 404, message: "Account class not found" },
  ACCOUNT_CLASS_IN_USE: { status: 409, message: "Cannot delete: account class is in use" },
  FAILED_TO_FETCH_ACCOUNT_CLASSES: { status: 500, message: "Failed to fetch account classes" },
  FAILED_TO_CREATE_ACCOUNT_CLASS: { status: 500, message: "Failed to create account class" },
  FAILED_TO_UPDATE_ACCOUNT_CLASS: { status: 500, message: "Failed to update account class" },
  FAILED_TO_DELETE_ACCOUNT_CLASS: { status: 500, message: "Failed to delete account class" },

  // ===== SYSTEM ROLES =====
  SYSTEM_ROLE_NOT_FOUND: { status: 404, message: "System role not found" },
  SYSTEM_ROLE_IN_USE: { status: 409, message: "Cannot delete: role is assigned to users" },
  FAILED_TO_FETCH_SYSTEM_ROLES: { status: 500, message: "Failed to fetch system roles" },
  FAILED_TO_CREATE_SYSTEM_ROLE: { status: 500, message: "Failed to create system role" },
  FAILED_TO_UPDATE_SYSTEM_ROLE: { status: 500, message: "Failed to update system role" },
  FAILED_TO_DELETE_SYSTEM_ROLE: { status: 500, message: "Failed to delete system role" },

  // ===== TARGETS =====
  FAILED_TO_FETCH_BUSINESS_TARGET: { status: 500, message: "Failed to fetch business target" },
  FAILED_TO_FETCH_YEARLY_TARGETS: { status: 500, message: "Failed to fetch yearly targets" },
  YEAR_AND_MONTH_REQUIRED: { status: 400, message: "Year and month are required" },
  FAILED_TO_UPDATE_BUSINESS_TARGET: { status: 500, message: "Failed to update business target" },
  FAILED_TO_CREATE_BUSINESS_TARGET: { status: 500, message: "Failed to create business target" },
  FAILED_TO_FETCH_USER_TARGET: { status: 500, message: "Failed to fetch user target" },
  FAILED_TO_FETCH_USER_TARGETS: { status: 500, message: "Failed to fetch user targets" },
  USER_YEAR_MONTH_REQUIRED: { status: 400, message: "User ID, year and month are required" },
  FAILED_TO_SAVE_USER_TARGET: { status: 500, message: "Failed to save user target" },
  FAILED_TO_FETCH_CATEGORY_TARGETS: { status: 500, message: "Failed to fetch category targets" },
  CATEGORY_YEAR_MONTH_REQUIRED: { status: 400, message: "Category ID, year and month are required" },
  FAILED_TO_SAVE_CATEGORY_TARGET: { status: 500, message: "Failed to save category target" },
  INVALID_TARGETS_ARRAY: { status: 400, message: "Invalid targets array provided" },

  // ===== CHEQUES =====
  INVALID_TRANSACTION_TYPE: { status: 400, message: "Invalid transaction type" },
  CHEQUE_NUMBER_REQUIRED: { status: 400, message: "Cheque/reference number is required" },
  INVALID_PAYEE_TYPE: { status: 400, message: "Invalid payee type" },
  PAYEE_NAME_REQUIRED: { status: 400, message: "Payee name is required" },
  PAYEE_ID_REQUIRED: { status: 400, message: "Payee must be selected" },
  BANK_ACCOUNT_REQUIRED: { status: 400, message: "Bank account is required" },
  DEBIT_ACCOUNT_REQUIRED: { status: 400, message: "Charge account is required" },
  CHEQUE_DATE_REQUIRED: { status: 400, message: "Date is required" },
  INVALID_AMOUNT: { status: 400, message: "Amount must be greater than zero" },
  CHEQUE_NUMBER_ALREADY_EXISTS: { status: 409, message: "Cheque number already exists" },
  CHEQUE_NOT_FOUND: { status: 404, message: "Cheque not found" },
  CHEQUE_NOT_IN_ISSUED_STATUS: { status: 400, message: "Cheque is not in issued status" },
  CHEQUE_ALREADY_VOIDED: { status: 400, message: "Cheque is already voided" },
  FAILED_TO_FETCH_CHEQUES: { status: 500, message: "Failed to fetch cheques" },
  FAILED_TO_CREATE_CHEQUE: { status: 500, message: "Failed to create cheque" },
  FAILED_TO_CREATE_CHEQUE_JOURNAL: { status: 500, message: "Failed to create journal entry for cheque" },
  FAILED_TO_CREATE_CHEQUE_JOURNAL_LINES: { status: 500, message: "Failed to create journal lines for cheque" },
  FAILED_TO_CLEAR_CHEQUE: { status: 500, message: "Failed to clear cheque" },
  FAILED_TO_VOID_CHEQUE: { status: 500, message: "Failed to void cheque" },

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

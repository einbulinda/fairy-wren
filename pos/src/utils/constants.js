export const USER_ROLES = {
  WAITRESS: "waitress",
  BARTENDER: "bartender",
  MANAGER: "manager",
  OWNER: "owner",
};

export const BILL_STATUS = {
  OPEN: "open",
  AWAITING_CONFIRMATION: "awaiting_confirmation",
  COMPLETED: "completed",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  MPESA: "mpesa",
};

export const APPROVAL_TYPES = {
  VOID: "void",
  DISCOUNT: "discount",
};

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const EXPENSE_CATEGORIES = [
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "salaries", label: "Salaries" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

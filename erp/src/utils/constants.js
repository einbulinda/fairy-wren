export const USER_ROLES = {
  WAITRESS: "waitress",
  BARTENDER: "bartender",
  MANAGER: "manager",
  OWNER: "owner",
};

export const ERP_ALLOWED_ROLES = [USER_ROLES.OWNER];

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

export const dateInputCls =
  "px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

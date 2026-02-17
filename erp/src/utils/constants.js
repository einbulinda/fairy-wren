export const USER_ROLES = {
  WAITRESS: "waitress",
  BARTENDER: "bartender",
  MANAGER: "manager",
  OWNER: "owner",
  ADMIN: "system developer",
};

export const ERP_ALLOWED_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.ADMIN,
];

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};
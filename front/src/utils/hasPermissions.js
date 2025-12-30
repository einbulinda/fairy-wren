import { permissions } from "./permissions";
export const hasPermissions = (user, permission) => {
  if (!user || !user.role) return false;

  return !!permissions[user.role]?.[permission];
};

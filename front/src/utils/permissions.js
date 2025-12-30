export const permissions = {
  admin: {
    expenses: true,
    reports: true,
    voidBill: true,
  },
  manager: {
    expenses: true,
    reports: true,
    voidBill: true,
  },
  cashier: {
    expenses: false,
    reports: false,
    voidBill: false,
  },
};

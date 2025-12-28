export const usersBills = (bills, user) => {
  if (["owner", "bartender", "manager"].includes(user.role)) return bills;

  const filteredBills = bills.filter((bill) => bill.waitress_id === user.id);

  return filteredBills;
};

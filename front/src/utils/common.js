export const usersBills = (bills, user) => {
  if (["owner", "bartender", "manager"].includes(user.role)) return bills;

  const filteredBills = bills.filter((bill) => bill.waitress_id === user.id);

  return filteredBills;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(value || 0);

// Title Case
export const titleCase = (s) => {
  return s
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

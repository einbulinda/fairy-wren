export const calculateBillTotals = (bill) => {
  if (!bill || !bill.rounds) return { subtotal: 0, total: 0 };

  const allItems = bill.rounds.flatMap((round) => round.round_items || []);

  const subtotal = allItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * parseInt(item.quantity),
    0
  );

  const total = subtotal;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

export const calculateBillPaymentInfo = (bill) => {
  const total = calculateBillTotals(bill).total;
  const payments = bill.payments || [];
  const amountPaid = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  return {
    total,
    amountPaid: parseFloat(amountPaid.toFixed(2)),
    pendingAmount: parseFloat(pendingAmount.toFixed(2)),
    balanceDue: parseFloat((total - amountPaid).toFixed(2)),
    payableAmount: parseFloat((total - amountPaid - pendingAmount).toFixed(2)),
  };
};

export const calculateRoundTotal = (items) => {
  return items.reduce((sum, item) => {
    return sum + parseFloat(item.price) * parseInt(item.quantity);
  }, 0);
};

export const formatCurrency = (amount) => {
  return `${parseFloat(amount).toFixed(2)} KES`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getStockColor = (stock) => {
  if (stock < 20) return "text-red-500";
  if (stock < 50) return "text-yellow-500";
  return "text-green-500";
};



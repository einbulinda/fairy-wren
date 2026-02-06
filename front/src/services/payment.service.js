import api from "./api";

/**
 * Fetch all bills with payments
 */
export const fetchBills = async () => {
  const response = await api.get("/bills");
  return response.data.data; // { success, data }
};

// Fetch all payments

/**
 * Confirm bill and mark payments as paid
 */
export const confirmBill = async (billId, payload) => {
  const response = await api.post("/payments", payload);
  return response.data;
};

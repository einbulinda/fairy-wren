import api from "./api";

/**
 * Fetch all bills with payments
 */
export const fetchBills = async () => {
  const response = await api.get("/payments");
  return response.data.data; // { success, data }
};

/**
 * Confirm bill and mark payments as paid
 */
export const confirmBill = async (billId, payload) => {
  const response = await api.patch(`/payments/${billId}`, payload);
  return response.data;
};

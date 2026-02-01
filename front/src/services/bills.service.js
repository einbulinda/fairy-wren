import normalizeError from "../utils/errorFormatter";
import api from "./api";

// Fetch all Open Bills
export const fetchOpenBills = async () => {
  try {
    const response = await api.get("/bills?status=open");
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error fetching open bills.");
  }
};

export const fetchAllBills = async () => {
  try {
    const response = await api.get("/bills");
    return response.data;
  } catch (err) {
    throw normalizeError(err, "Error fetching all bills");
  }
};

// Create a new bill
export const createBill = async (payload) => {
  try {
    const { data } = await api.post("/bills", payload);
    return data;
  } catch (error) {
    throw normalizeError(error, "Error creating bill");
  }
};

// Add a round to a bill
export const addBillRound = async (billId, payload) => {
  try {
    const { data } = await api.post(`/bills/${billId}/rounds`, payload);

    return data;
  } catch (error) {
    throw normalizeError(error, "Error adding bill round");
  }
};

// Mark Bill as Paid
export const markBillPaid = (billId, payload) =>
  api.patch(`/bills/${billId}/status`, payload);

// Confirm Bill Payment
export const confirmBillPayment = (billId, payload) =>
  api.patch(`/bills/${billId}/status`, payload);

// Voiding a Bill
export const voidBill = (billId) => api.delete(`/bills/${billId}`);

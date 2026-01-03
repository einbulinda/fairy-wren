import normalizeError from "../utils/errorFormatter";
import api from "./api";

// Fetch all Open Bills
export const fetchOpenBills = async () => {
  try {
    const response = await api.get("/bills/open");
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error fetching open bills.");
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
    console.log("API call - adding round to bill:", billId, payload);
    const { data } = await api.post(`/bills/${billId}/rounds`, payload);

    return data;
  } catch (error) {
    throw normalizeError(error, "Error adding bill round");
  }
};

// Mark Bill as Paid
export const markBillPaid = (billId, payload) =>
  api.patch(`/bills/${billId}/mark-paid`, payload);

// Confirm Bill Payment
export const confirmBillPayment = (billId) =>
  api.patch(`/bills/${billId}/confirm`);

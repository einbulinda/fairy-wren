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

    console.log("API response - updated bill:", data);
    return data;
  } catch (error) {
    throw normalizeError(error, "Error adding bill round");
  }
};

// Mark Bill as Paid
export const markBillPaid = async (billId, payload) => {
  try {
    const { data } = await api.patch(`/bills/${billId}/mark-paid`, payload);
    return data;
  } catch (error) {
    throw normalizeError(error, "Error marking bill as paid");
  }
};

// Confirm Bill Payment
export const confirmBillPayment = async (billId) => {
  try {
    const { data } = await api.patch(`/bills/${billId}/confirm`);
    return data;
  } catch (error) {
    throw normalizeError(error, "Error confirming payment");
  }
};

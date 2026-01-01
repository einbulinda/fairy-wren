import api from "./api";

// Fetch Expenses
export const fetchExpenses = () => api.get("/expenses").then((res) => res.data);

// Save an expense
export const createExpense = (payload) => api.post("/expenses", payload);

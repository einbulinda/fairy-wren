import api from "./api";

const expenseAPI = {
  // Fetch Expenses
  fetchExpenses: api.get("/expenses").then((res) => res.data),
  createExpense: (payload) => api.post("/expenses", payload),
};

export default expenseAPI;

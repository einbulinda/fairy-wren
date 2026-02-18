import api from "@/api";

export const fetchExpenses = async () => {
  // Expenses controller returns data directly (not wrapped in { data: ... })
  const { data } = await api.get("/expenses");
  return Array.isArray(data) ? data : (data?.data ?? []);
};

export const createExpense = async (payload) => {
  const { data } = await api.post("/expenses", payload);
  return data;
};
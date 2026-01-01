import api from "./api";

export const fetchSuppliers = () =>
  api.get("/suppliers").then((res) => res.data);

export const createSupplier = (payload) => api.post("/suppliers", payload);

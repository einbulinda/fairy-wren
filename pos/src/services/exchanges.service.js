import api from "@/api";

export const exchangesService = {
  getPartners: (params) =>
    api.get("/exchanges/partners", { params }).then((res) => res.data),

  createPartner: (payload) =>
    api.post("/exchanges/partners", payload).then((res) => res.data),

  createExchange: (payload) =>
    api.post("/exchanges", payload).then((res) => res.data),

  getAllExchanges: (params) =>
    api.get("/exchanges", { params }).then((res) => res.data),

  getExchangeDetail: (id) =>
    api.get(`/exchanges/${id}`).then((res) => res.data),
};

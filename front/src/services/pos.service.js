import api from "./api";

export const bootstrapPOS = () =>
  api.get("/pos/bootstrap").then((res) => res.data);

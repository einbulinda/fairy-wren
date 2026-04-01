import api from "@/api";

export const fetchReservations = ({
  status,
  date,
  limit = 50,
  offset = 0,
} = {}) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (date) params.set("date", date);
  params.set("limit", limit);
  params.set("offset", offset);
  return api.get(`/reservations?${params}`).then((r) => r.data);
};

export const updateReservationStatus = (id, status) =>
  api.patch(`/reservations/${id}/status`, { status }).then((r) => r.data);

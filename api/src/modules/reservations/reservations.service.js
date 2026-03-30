const repo = require("./reservations.repository");

exports.submit = async ({ name, phone, email, reservation_date, reservation_time, party_size, drink_of_choice, special_occasion, notes }) => {
  if (!name?.trim()) throw new Error("RESERVATION_NAME_REQUIRED");
  if (!reservation_date) throw new Error("RESERVATION_DATE_REQUIRED");
  if (!party_size || party_size < 1) throw new Error("RESERVATION_PARTY_SIZE_REQUIRED");
  if (!phone?.trim() && !email?.trim()) throw new Error("RESERVATION_CONTACT_REQUIRED");

  const { data, error } = await repo.create({
    name: name.trim(),
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    reservation_date,
    reservation_time: reservation_time || null,
    party_size: parseInt(party_size, 10),
    drink_of_choice: drink_of_choice?.trim() || null,
    special_occasion: special_occasion?.trim() || null,
    notes: notes?.trim() || null,
    status: "pending",
  });

  if (error) throw new Error("FAILED_TO_SAVE_RESERVATION");

  // Notify ERP via WebSocket
  const broadcast = global.broadcast;
  if (broadcast) {
    broadcast("reservation:new", {
      id: data.id,
      name: data.name,
      reservation_date: data.reservation_date,
      reservation_time: data.reservation_time,
      party_size: data.party_size,
      special_occasion: data.special_occasion,
      created_at: data.created_at,
    });
  }

  return data;
};

exports.list = async (filters) => {
  const { data, error, count } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_RESERVATIONS");
  return { reservations: data, total: count };
};

exports.updateStatus = async (id, status) => {
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("RESERVATION_NOT_FOUND");

  const { data, error } = await repo.updateStatus(id, status);
  if (error) throw new Error("FAILED_TO_UPDATE_RESERVATION");
  return data;
};

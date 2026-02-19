exports.CreateSupplierDTO = (payload) => ({
  name: payload.name?.trim(),
  contact_person: payload.contact_person || null,
  phone: payload.phone || null,
  email: payload.email || null,
  address: payload.address || null,
});

exports.UpdateSupplierDTO = (payload) => {
  const dto = {};

  if (payload.name !== undefined) dto.name = payload.name.trim();
  if (payload.contact_person !== undefined)
    dto.contact_person = payload.contact_person;
  if (payload.phone !== undefined) dto.phone = payload.phone;
  if (payload.email !== undefined) dto.email = payload.email;
  if (payload.address !== undefined) dto.address = payload.address;

  return dto;
};

exports.CreatePaymentDTO = (payload) => ({
  payment_date: payload.payment_date,
  amount: Number(payload.amount),
  payment_method: payload.payment_method || "bank",
  reference: payload.reference?.trim() || null,
  bank_account_id: payload.bank_account_id || null,
  notes: payload.notes?.trim() || null,
});

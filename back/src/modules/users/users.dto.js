exports.CreateUserDTO = (payload) => ({
  name: String(payload.name).trim(),
  pin: String(payload.pin),
  role: String(payload.role),
  mobile_no: String(payload.mobile_no),
  active: payload.active !== undefined ? Boolean(payload.active) : true,
});

exports.UpdateUserDTO = (payload) => {
  const dto = {};
  if (payload.name !== undefined) dto.name = String(payload.name).trim();
  if (payload.pin !== undefined) dto.pin = String(payload.pin_hash);
  if (payload.role !== undefined) dto.role = String(payload.role);
  if (payload.mobile_no !== undefined)
    dto.mobile_no = String(payload.mobile_no);
  if (payload.active !== undefined) dto.active = Boolean(payload.active);

  return dto;
};

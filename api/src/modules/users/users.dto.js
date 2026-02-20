exports.CreateUserDTO = (p) => ({
  name: String(p.name).trim(),
  pin: String(p.pin),
  role: String(p.role),
});

exports.UpdateUserDTO = (p) => {
  const dto = {};
  if (p.name !== undefined) dto.name = String(p.name).trim();
  if (p.pin !== undefined) dto.pin = String(p.pin); // raw PIN — service will hash
  if (p.role !== undefined) dto.role = String(p.role);
  if (p.active !== undefined) dto.active = Boolean(p.active);
  return dto;
};

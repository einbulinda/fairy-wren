exports.CreateCategoryDTO = (payload) => ({
  name: payload.name?.trim(),
  color: payload.color || null,
});

exports.UpdateCategoryDTO = (payload) => {
  const dto = {};

  if (payload.name !== undefined) dto.name = payload.name.trim();
  if (payload.color !== undefined) dto.color = payload.color;
  if (payload.active !== undefined) dto.active = payload.active;

  return dto;
};

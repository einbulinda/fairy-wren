exports.CreateCategoryDTO = (payload) => ({
  name: payload.name?.trim(),
  description: payload.description || null,
});

exports.UpdateCategoryDTO = (payload) => {
  const dto = {};

  if (payload.name !== undefined) {
    dto.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    dto.description = payload.description;
  }

  return dto;
};

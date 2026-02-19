exports.CreateProductDTO = (payload) => ({
  name: String(payload.name).trim(),
  price: Number(payload.price),
  category_id: payload.category_id || null,
  active: payload.active !== undefined ? Boolean(payload.active) : true,
});

exports.UpdateProductDTO = (payload) => {
  const dto = {};

  if (payload.name !== undefined) dto.name = String(payload.name).trim();
  if (payload.price !== undefined) dto.price = Number(payload.price);
  if (payload.category_id !== undefined) dto.category_id = payload.category_id;
  if (payload.active !== undefined) dto.active = Boolean(payload.active);

  return dto;
};

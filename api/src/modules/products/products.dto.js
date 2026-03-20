exports.CreateProductDTO = (payload) => {
  const dto = {
    name: String(payload.name).trim(),
    price: Number(payload.price),
    category_id: payload.category_id || null,
    active: payload.active !== undefined ? Boolean(payload.active) : true,
  };
  if (payload.cost_price !== undefined && payload.cost_price !== null)
    dto.cost_price = Number(payload.cost_price);
  if (payload.unit !== undefined) dto.unit = payload.unit;
  if (payload.track_inventory !== undefined)
    dto.track_inventory = Boolean(payload.track_inventory);
  if (payload.reorder_level !== undefined && payload.reorder_level !== null)
    dto.reorder_level = Number(payload.reorder_level);
  if (payload.volume_ml !== undefined)
    dto.volume_ml = payload.volume_ml !== null && payload.volume_ml !== ""
      ? Number(payload.volume_ml)
      : null;
  return dto;
};

exports.UpdateProductDTO = (payload) => {
  const dto = {};

  if (payload.name !== undefined) dto.name = String(payload.name).trim();
  if (payload.price !== undefined) dto.price = Number(payload.price);
  if (payload.category_id !== undefined) dto.category_id = payload.category_id;
  if (payload.active !== undefined) dto.active = Boolean(payload.active);
  if (payload.cost_price !== undefined) dto.cost_price = payload.cost_price;
  if (payload.unit !== undefined) dto.unit = payload.unit;
  if (payload.track_inventory !== undefined)
    dto.track_inventory = Boolean(payload.track_inventory);
  if (payload.reorder_level !== undefined)
    dto.reorder_level = Number(payload.reorder_level);
  if (payload.volume_ml !== undefined)
    dto.volume_ml = payload.volume_ml !== null && payload.volume_ml !== ""
      ? Number(payload.volume_ml)
      : null;

  return dto;
};

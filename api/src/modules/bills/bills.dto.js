exports.CreateBillDTO = (payload) => ({
  customer_name: payload.customer_name || null,
});

exports.AddRoundDTO = (payload) => ({
  round_number: payload.round_number,
  items: Array.isArray(payload.items) ? payload.items : [],
});

exports.UpdateBillStatusDTO = (payload) => ({
  status: payload.status,
});

exports.VoidBillDTO = (payload) => ({
  reason: payload?.reason || "Bill voided by user",
});

exports.ExchangeItemDTO = (payload) => ({
  returned_item_id: payload.returned_item_id || null,
  returned_quantity: parseInt(payload.returned_quantity) || 1,
  replacement_product_id: payload.replacement_product_id || null,
  replacement_quantity: parseInt(payload.replacement_quantity) || 1,
  replacement_price: parseFloat(payload.replacement_price) || 0,
  authorizer_pin: payload.authorizer_pin || null,
});

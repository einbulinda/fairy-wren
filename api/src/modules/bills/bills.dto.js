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

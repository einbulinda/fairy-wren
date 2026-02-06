const getSupabase = require("../../../config/supabase");

/* ---------- CREATE SESSION ---------- */
exports.createSession = async ({
  userId,
  stockTakeName,
  stockTakeType,
  location,
}) => {
  const supabase = getSupabase();

  return supabase.rpc("create_stock_take_session", {
    p_performed_by_id: userId,
    p_stock_take_name: stockTakeName,
    p_stock_take_type: stockTakeType,
    p_location: location,
  });
};

/* ---------- RECORD ITEM ---------- */
exports.recordItem = async (payload) => {
  const supabase = getSupabase();

  return supabase.rpc("record_stock_take_item", {
    p_stock_take_id: payload.stockTakeId,
    p_product_id: payload.productId,
    p_physical_qty: payload.physicalQty,
    p_reason: payload.reason,
    p_notes: payload.notes,
  });
};

/* ---------- COMPLETE ---------- */
exports.completeSession = async (stockTakeId, userId) => {
  const supabase = getSupabase();

  return supabase.rpc("complete_stock_take_session", {
    p_stock_take_id: stockTakeId,
    p_completed_by_id: userId,
  });
};

/* ---------- APPROVE ---------- */
exports.approve = async (stockTakeId, reviewerId, notes) => {
  const supabase = getSupabase();

  return supabase.rpc("approve_stock_take", {
    p_stock_take_id: stockTakeId,
    p_reviewed_by_id: reviewerId,
    p_approval_notes: notes,
  });
};

/* ---------- REJECT ---------- */
exports.reject = async (stockTakeId, reviewerId, reason) => {
  const supabase = getSupabase();

  return supabase.rpc("reject_stock_take", {
    p_stock_take_id: stockTakeId,
    p_reviewed_by_id: reviewerId,
    p_rejection_reason: reason,
  });
};

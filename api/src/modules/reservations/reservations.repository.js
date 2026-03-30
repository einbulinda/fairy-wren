const getSupabase = require("../../config/supabase");

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("reservations").insert(payload).select().single();
};

exports.findAll = async ({ status, date, limit = 50, offset = 0 } = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("reservations")
    .select("*", { count: "exact" })
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (date) query = query.eq("reservation_date", date);

  return query;
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("reservations").select("*").eq("id", id).single();
};

exports.updateStatus = async (id, status) => {
  const supabase = getSupabase();
  return supabase.from("reservations").update({ status }).eq("id", id).select().single();
};

const getSupabase = require("../../config/supabase");

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("customer_feedback").insert(payload).select().single();
};

exports.findAll = async ({ status, limit = 50, offset = 0 } = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("customer_feedback")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  return query;
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("customer_feedback").select("*").eq("id", id).single();
};

exports.updateStatus = async (id, status) => {
  const supabase = getSupabase();
  return supabase.from("customer_feedback").update({ status }).eq("id", id).select().single();
};

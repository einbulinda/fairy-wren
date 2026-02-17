const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();

  const query = supabase.from("categories").select("id,name,active,color");

  if (filters.status) query.eq("status", filters.status);
  return query.order("name");
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("categories")
    .select("id, name, active, color")
    .eq("id", id)
    .single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("categories").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
};

exports.archive = async (id, active) => {
  const supabase = getSupabase();
  return supabase.from("categories").update({ active }).eq("id", id);
};

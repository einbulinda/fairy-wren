const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("products").select("*, categories(*)");

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }
  return query.order("name");
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  supabase.from("products").select("*").eq("id", id).single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  supabase.from("products").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  supabase.from("products").update(payload).eq("id", id).select().single();
};

exports.archive = async (id) => {
  const supabase = getSupabase();
  supabase.from("products").update({ active: false }).eq("id", id);
};

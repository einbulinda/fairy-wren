const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("profiles").select("*");

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }
  return query.order("name");
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("profiles").select("*").eq("id", id).single();
};

exports.userExists = async (fingerprint) => {
  const supabase = getSupabase();
  return supabase
    .from("profiles")
    .select("id")
    .eq("pin_fingerprint", fingerprint)
    .maybeSingle();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("profiles").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
};

exports.archive = async (id) => {
  const supabase = getSupabase();
  return supabase.from("profiles").update({ active: false }).eq("id", id);
};

const getSupabase = require("../../config/supabase");

exports.findAll = async () => {
  const supabase = getSupabase();
  return supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: false });
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("suppliers").select("*").eq("id", id).single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("suppliers").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("suppliers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
};

exports.archive = async (id, active) => {
  const supabase = getSupabase();
  return supabase.from("suppliers").update(active).eq("id", id);
};

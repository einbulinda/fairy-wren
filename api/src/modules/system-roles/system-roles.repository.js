const getSupabase = require("../../config/supabase");

exports.findAll = async () => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .select("*")
    .order("sort_order", { ascending: true });
};

exports.findActive = async () => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
};

exports.findByCode = async (code) => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .select("*")
    .eq("code", code)
    .maybeSingle();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .insert(payload)
    .select()
    .single();
};

exports.update = async (code, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .update(payload)
    .eq("code", code)
    .select()
    .single();
};

exports.delete = async (code) => {
  const supabase = getSupabase();
  return supabase
    .from("system_roles")
    .delete()
    .eq("code", code);
};

exports.isInUse = async (code) => {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", code);
  return count > 0;
};

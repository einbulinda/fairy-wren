const getSupabase = require("../../config/supabase");

exports.findAll = async () => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .select("*")
    .order("sort_order", { ascending: true });
};

exports.findActive = async () => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
};

exports.findByCode = async (code) => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .insert(payload)
    .select()
    .single();
};

exports.update = async (code, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .update(payload)
    .eq("code", code)
    .select()
    .single();
};

exports.delete = async (code) => {
  const supabase = getSupabase();
  return supabase
    .from("account_classes")
    .delete()
    .eq("code", code);
};

exports.isInUse = async (code) => {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("chart_of_accounts")
    .select("id", { count: "exact", head: true })
    .eq("account_class", code);
  return count > 0;
};

const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("chart_of_accounts").select("*");

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters.account_class) {
    query = query.eq("account_class", filters.account_class);
  }

  if (filters.is_control_account !== undefined) {
    query = query.eq("is_control_account", filters.is_control_account);
  }

  if (filters.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", filters.parent_id);
    }
  }

  return query.order("code", { ascending: true });
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("id", id)
    .single();
};

exports.findByCode = async (code) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("code", code)
    .maybeSingle();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .insert(payload)
    .select()
    .single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

exports.updateStatus = async (id, active) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

exports.delete = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .delete()
    .eq("id", id);
};

exports.getChildren = async (parentId) => {
  const supabase = getSupabase();
  return supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("parent_id", parentId)
    .order("code", { ascending: true });
};

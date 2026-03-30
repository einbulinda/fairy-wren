const getSupabase = require("../../config/supabase");

exports.findAll = async ({ activeOnly = false } = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("gallery_images")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (activeOnly) query = query.eq("active", true);
  return query;
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("gallery_images").select("*").eq("id", id).single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("gallery_images").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase.from("gallery_images").update(payload).eq("id", id).select().single();
};

exports.remove = async (id) => {
  const supabase = getSupabase();
  return supabase.from("gallery_images").delete().eq("id", id);
};

exports.getMaxSortOrder = async () => {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  return data?.sort_order ?? -1;
};

const getSupabase = require("../../config/supabase");

exports.getAll = async () => {
  const supabase = getSupabase();
  return supabase.from("settings").select("*");
};

exports.getByKey = async (key) => {
  const supabase = getSupabase();
  return supabase.from("settings").select("value").eq("key", key).single();
};

exports.bulkUpsert = async (entries) => {
  const supabase = getSupabase();
  return supabase.from("settings").upsert(entries, { onConflict: "key" });
};

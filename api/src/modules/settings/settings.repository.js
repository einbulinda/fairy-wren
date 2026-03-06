const getSupabase = require("../../config/supabase");

exports.getAll = async () => {
  const supabase = getSupabase();
  return supabase.from("settings").select("*");
};

exports.bulkUpsert = async (entries) => {
  const supabase = getSupabase();
  return supabase.from("settings").upsert(entries, { onConflict: "key" });
};

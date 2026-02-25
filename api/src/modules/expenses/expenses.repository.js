const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  return supabase.rpc("rpc_unified_expenses", {
    p_start_date: filters.from || null,
    p_end_date: filters.to || null,
  });
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("expenses").insert(payload).select().single();
};

exports.linkJournal = async (expenseId, journalEntryId) => {
  const supabase = getSupabase();
  return supabase
    .from("expenses")
    .update({ journal_entry_id: journalEntryId })
    .eq("id", expenseId);
};

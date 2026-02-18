const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("journal_entries")
    .select(`
      id, entry_date, reference, description, source_type, source_id,
      reversed_entry_id, created_at,
      journal_lines(id, account_id, debit, credit,
        chart_of_accounts(code, name))
    `)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.source_type) query = query.eq("source_type", filters.source_type);
  if (filters.from) query = query.gte("entry_date", filters.from);
  if (filters.to) query = query.lte("entry_date", filters.to);

  return query;
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("journal_entries")
    .select(`
      id, entry_date, reference, description, source_type, source_id,
      reversed_entry_id, created_at,
      journal_lines(id, account_id, debit, credit, description,
        chart_of_accounts(code, name, account_class))
    `)
    .eq("id", id)
    .single();
};

exports.createEntry = async (entry) => {
  const supabase = getSupabase();
  return supabase
    .from("journal_entries")
    .insert(entry)
    .select()
    .single();
};

exports.createLines = async (lines) => {
  const supabase = getSupabase();
  return supabase
    .from("journal_lines")
    .insert(lines)
    .select();
};

exports.updateReversedEntryId = async (originalId, reversalId) => {
  const supabase = getSupabase();
  return supabase
    .from("journal_entries")
    .update({ reversed_entry_id: reversalId })
    .eq("id", originalId);
};

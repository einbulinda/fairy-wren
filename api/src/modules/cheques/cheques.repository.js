const getSupabase = require("../../config/supabase");

const CHEQUE_SELECT = `
  id, cheque_number, payee_name, payee_type, payee_id, amount, cheque_date, memo, status, transaction_type,
  journal_entry_id, cleared_at, voided_at, created_at,
  bank_account:bank_account_id(code, name),
  debit_account:debit_account_id(code, name)
`;

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("cheques")
    .select(CHEQUE_SELECT)
    .order("cheque_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("cheque_date", filters.from);
  if (filters.to) query = query.lte("cheque_date", filters.to);

  return query;
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("cheques")
    .select(CHEQUE_SELECT)
    .eq("id", id)
    .single();
};

exports.findByNumber = async (chequeNumber) => {
  const supabase = getSupabase();
  return supabase
    .from("cheques")
    .select("id, cheque_number")
    .eq("cheque_number", chequeNumber)
    .maybeSingle();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase
    .from("cheques")
    .insert(payload)
    .select(CHEQUE_SELECT)
    .single();
};

exports.updateStatus = async (id, status, extra = {}) => {
  const supabase = getSupabase();
  return supabase
    .from("cheques")
    .update({ status, ...extra })
    .eq("id", id)
    .select(CHEQUE_SELECT)
    .single();
};

exports.linkJournal = async (chequeId, journalEntryId) => {
  const supabase = getSupabase();
  return supabase
    .from("cheques")
    .update({ journal_entry_id: journalEntryId })
    .eq("id", chequeId);
};

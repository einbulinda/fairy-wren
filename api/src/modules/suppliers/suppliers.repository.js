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

exports.findPurchases = async (supplierId) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select("id, invoice_number, purchase_date, total_amount, status, paid_at, notes")
    .eq("supplier_id", supplierId)
    .order("purchase_date", { ascending: false });
};

exports.findPayments = async (supplierId) => {
  const supabase = getSupabase();
  return supabase
    .from("supplier_payments")
    .select("*, chart_of_accounts(name, code)")
    .eq("supplier_id", supplierId)
    .order("payment_date", { ascending: false });
};

exports.createPayment = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("supplier_payments").insert(payload).select().single();
};

exports.findStatement = async (supplierId, startDate, endDate) => {
  const supabase = getSupabase();
  return supabase.rpc("rpc_supplier_statement", {
    p_supplier_id: supplierId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });
};

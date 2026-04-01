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
    .select("id, invoice_number, purchase_date, total_amount, amount_paid, status, paid_at, notes")
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

exports.deletePaymentByJournalId = async (journalEntryId) => {
  const supabase = getSupabase();
  return supabase
    .from("supplier_payments")
    .delete()
    .eq("journal_entry_id", journalEntryId);
};

exports.findPendingInvoices = async () => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select("id, invoice_number, purchase_date, total_amount, amount_paid, status, paid_at, notes, supplier_id, suppliers(id, name)")
    .is("paid_at", null)
    .order("purchase_date", { ascending: true });
};

exports.findUnpaidInvoices = async (supplierId) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select("id, invoice_number, purchase_date, total_amount, amount_paid")
    .eq("supplier_id", supplierId)
    .is("paid_at", null)
    .order("purchase_date", { ascending: true });
};

exports.createPaymentAllocations = async (allocations) => {
  const supabase = getSupabase();
  return supabase.from("supplier_payment_allocations").insert(allocations).select();
};

exports.updateInvoiceAmountPaid = async (invoiceId, amountPaid, totalAmount) => {
  const supabase = getSupabase();
  const update = { amount_paid: amountPaid };
  if (amountPaid >= totalAmount) {
    update.paid_at = new Date().toISOString();
  }
  return supabase.from("inventory_receipts").update(update).eq("id", invoiceId);
};

exports.findAllBalances = async () => {
  const supabase = getSupabase();
  const [{ data: purchases }, { data: payments }] = await Promise.all([
    supabase.from("inventory_receipts").select("supplier_id, total_amount"),
    supabase.from("supplier_payments").select("supplier_id, amount"),
  ]);
  const map = {};
  for (const p of purchases || []) {
    if (!map[p.supplier_id]) map[p.supplier_id] = { total_purchased: 0, total_paid: 0 };
    map[p.supplier_id].total_purchased += Number(p.total_amount || 0);
  }
  for (const p of payments || []) {
    if (!map[p.supplier_id]) map[p.supplier_id] = { total_purchased: 0, total_paid: 0 };
    map[p.supplier_id].total_paid += Number(p.amount || 0);
  }
  return Object.entries(map).map(([supplier_id, { total_purchased, total_paid }]) => ({
    supplier_id,
    total_purchased,
    total_paid,
    balance_due: total_purchased - total_paid,
  }));
};

exports.findInvoiceById = async (invoiceId) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select("id, total_amount, amount_paid")
    .eq("id", invoiceId)
    .single();
};

exports.findStatement = async (supplierId, startDate, endDate) => {
  const supabase = getSupabase();
  return supabase.rpc("rpc_supplier_statement", {
    p_supplier_id: supplierId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });
};

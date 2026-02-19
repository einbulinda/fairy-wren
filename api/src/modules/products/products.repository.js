const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("products_with_stock").select("*");

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }
  return query.order("name");
};

exports.findById = async (id) => {
  const supabase = getSupabase();

  const [{ data: product, error: pErr }, { data: stockRow }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*, categories(id, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("inventory_on_hand")
        .select("quantity_on_hand")
        .eq("product_id", id)
        .maybeSingle(),
    ]);

  if (pErr) return { data: null, error: pErr };

  return {
    data: { ...product, current_stock: stockRow?.quantity_on_hand ?? 0 },
    error: null,
  };
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("products").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
};

exports.archive = async (id) => {
  const supabase = getSupabase();
  return supabase.from("products").update({ active: false }).eq("id", id);
};

exports.findPurchaseHistory = async (productId) => {
  const supabase = getSupabase();

  // Fetch receipt items with their receipts (supplier_id has no FK constraint so
  // suppliers must be resolved in a second query)
  const { data: items, error: itemsErr } = await supabase
    .from("inventory_receipt_items")
    .select(
      `
      id,
      quantity,
      unit_cost,
      line_total,
      created_at,
      inventory_receipts!receipt_id (
        id,
        invoice_number,
        purchase_date,
        status,
        supplier_id
      )
    `,
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (itemsErr) return { data: null, error: itemsErr };
  if (!items?.length) return { data: [], error: null };

  const supplierIds = [
    ...new Set(
      items.map((i) => i.inventory_receipts?.supplier_id).filter(Boolean),
    ),
  ];

  if (!supplierIds.length) return { data: items, error: null };

  const { data: suppliers, error: suppErr } = await supabase
    .from("suppliers")
    .select("id, name")
    .in("id", supplierIds);

  if (suppErr) return { data: null, error: suppErr };

  const supplierMap = Object.fromEntries(
    (suppliers || []).map((s) => [s.id, s]),
  );

  const data = items.map((item) => ({
    ...item,
    inventory_receipts: item.inventory_receipts
      ? {
          ...item.inventory_receipts,
          suppliers: supplierMap[item.inventory_receipts.supplier_id] || null,
        }
      : null,
  }));

  return { data, error: null };
};

exports.findSalesHistory = async (productId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("round_items")
    .select(
      `
      id,
      quantity,
      price,
      rounds!round_id (
        id,
        round_number,
        created_at,
        bill_id
      )
    `,
    )
    .eq("product_id", productId)
    .order("created_at", { foreignTable: "rounds", ascending: false });

  if (error) return { data: null, error };

  const flattened = (data || []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    price: item.price,
    round_id: item.rounds?.id,
    round_number: item.rounds?.round_number,
    bill_id: item.rounds?.bill_id,
    sale_date: item.rounds?.created_at,
  }));

  return { data: flattened, error: null };
};

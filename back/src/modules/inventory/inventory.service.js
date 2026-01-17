const supabase = require("../../config/supabase");

/* ---------------- STOCK ---------------- */

exports.getStock = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,unit,current_stock,cost_price, categories(name)")
    .eq("track_inventory", true)
    .eq("active", true)
    .order("name");

  if (error) throw error;

  return data;
};

/* ---------------- RESTOCK ---------------- */

exports.restock = async ({ productId, quantity, unitCost, userId, notes }) => {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const { data: product, error } = await supabase
    .from("products")
    .select("current_stock, cost_price")
    .eq("id", productId)
    .single();

  if (error || !product) throw new Error("Product not found");

  const currentStock = Number(product.current_stock);
  const currentCost = Number(product.cost_price || 0);

  const newAvgCost =
    (currentStock * currentCost + quantity * unitCost) /
    (currentStock + quantity);

  // Ledger entry
  await supabase.from("inventory_ledger").insert({
    product_id: productId,
    transaction_type: "RESTOCK",
    quantity,
    unit_cost: unitCost,
    notes,
    created_by: userId,
  });

  // Update snapshot
  await supabase
    .from("products")
    .update({
      current_stock: currentStock + quantity,
      cost_price: newAvgCost,
    })
    .eq("id", productId);
};

/* ---------------- STOCK TAKE ---------------- */

exports.createStockTake = async (userId) => {
  const { data, error } = await supabase
    .from("stock_takes")
    .insert({ performed_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.saveStockTakeItems = async (stockTakeId, items) => {
  const records = items.map((i) => ({
    stock_take_id: stockTakeId,
    product_id: i.productId,
    system_qty: i.systemQty,
    physical_qty: i.physicalQty,
    variance: i.physicalQty - i.systemQty,
  }));

  const { error } = await supabase.from("stock_take_items").upsert(records, {
    onConflict: "stock_take_id,product_id",
  });

  if (error) throw error;
};

exports.completeStockTake = async (stockTakeId, userId) => {
  const { data: items, error } = await supabase
    .from("stock_take_items")
    .select("*")
    .eq("stock_take_id", stockTakeId);

  if (error) throw error;

  for (const item of items) {
    if (item.variance !== 0) {
      // Ledger
      await supabase.from("inventory_ledger").insert({
        product_id: item.product_id,
        transaction_type: "STOCKTAKE_ADJUSTMENT",
        quantity: item.variance,
        reference_id: stockTakeId,
        created_by: userId,
      });

      // Update product stock
      await supabase.rpc("increment_stock", {
        product_id: item.product_id,
        quantity: item.variance,
      });
    }
  }

  await supabase
    .from("stock_takes")
    .update({ status: "completed" })
    .eq("id", stockTakeId);
};

/* ---------------- LEDGER ---------------- */

exports.getLedger = async ({ productId, from, to }) => {
  let query = supabase
    .from("inventory_ledger")
    .select("*, products(name)")
    .order("created_at", { ascending: false });

  if (productId) query = query.eq("product_id", productId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;

  return data;
};

exports.receiveInventory = async ({
  supplier_id,
  invoice_number,
  purchase_date,
  total_amount,
  line_items,
  userId,
}) => {
  if (!supplier_id) throw new Error("Supplier is required");
  if (!invoice_number) throw new Error("Invoice number is required");
  if (!purchase_date) throw new Error("Purchase date is required");

  if (!Array.isArray(line_items) || line_items.length === 0) {
    throw new Error("At least one product is required");
  }

  // 1) Create receipt header
  const { data: receipt, error: receiptError } = await supabase
    .from("inventory_receipts")
    .insert({
      supplier_id,
      invoice_number,
      purchase_date,
      total_amount,
      created_by: userId,
    })
    .select()
    .single();

  if (receiptError) throw receiptError;

  // 2) Create receipt items
  const receiptItems = line_items.map((item) => ({
    receipt_id: receipt.id,
    product_id: item.product_id,
    quantity: Number(item.quantity),
    unit_cost: Number(item.cost_price),
    line_total: Number(item.quantity) * Number(item.cost_price),
  }));

  const { error: itemsError } = await supabase
    .from("inventory_receipt_items")
    .insert(receiptItems);

  if (itemsError) throw itemsError;

  // 3) Update stock + ledger per item
  for (const item of line_items) {
    await exports.restock({
      productId: item.product_id,
      quantity: Number(item.quantity),
      unitCost: Number(item.cost_price),
      userId,
      notes: `Receipt ${invoice_number}`,
    });
  }

  return receipt;
};

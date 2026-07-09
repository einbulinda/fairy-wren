const fs = require("fs");
const path = require("path");
const repo = require("./products.repository");
const { CreateProductDTO, UpdateProductDTO } = require("./products.dto");
const auditRepo = require("../audit/audit.repository");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/products");

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function buildPublicUrl(filename) {
  const base = (process.env.BASE_URL || "http://localhost:8000").replace(/\/$/, "");
  return `${base}/uploads/products/${filename}`;
}

function deleteFile(imageUrl) {
  if (!imageUrl?.includes("/uploads/products/")) return;
  const filename = imageUrl.split("/uploads/products/").pop();
  const filePath = path.join(UPLOAD_DIR, filename);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) {
    throw new Error("FAILED_TO_FETCH_PRODUCTS");
  }
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("PRODUCT_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload?.name || payload.price === undefined)
    throw new Error("INVALID_PRODUCT_DATA");

  const dto = CreateProductDTO(payload);
  const { data, error } = await repo.create(dto);

  if (error) throw new Error("FAILED_TO_CREATE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: data.id,
    action: "CREATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, price: data.price },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateProductDTO(payload);
  if (Object.keys(dto).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: id,
    action: "UPDATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.updateStatus = async (id, active, context) =>
  exports.update(id, { active }, context);

exports.archive = async (id, context) => {
  const { error } = await repo.archive(id);
  if (error) throw new Error("FAILED_TO_ARCHIVE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: id,
    action: "ARCHIVE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};

exports.getPurchaseHistory = async (productId, dateRange) => {
  const { data, error } = await repo.findPurchaseHistory(productId, dateRange);
  if (error) {
    console.log(
      "Error fetching purchase history for product",
      productId,
      error,
    );
    throw new Error("FAILED_TO_FETCH_PURCHASE_HISTORY");
  }
  return data ?? [];
};

exports.getSalesHistory = async (productId, dateRange) => {
  const { data, error } = await repo.findSalesHistory(productId, dateRange);
  if (error) {
    throw new Error("FAILED_TO_FETCH_SALES_HISTORY");
  }
  return data ?? [];
};

exports.getProductStatement = async (productId, dateRange) => {
  const { data, error } = await repo.findProductStatement(productId, dateRange);
  if (error) throw new Error("FAILED_TO_FETCH_PRODUCT_STATEMENT");
  return data;
};

exports.uploadImage = async (productId, file) => {
  const { data: existing } = await repo.findById(productId);
  if (!existing) throw new Error("PRODUCT_NOT_FOUND");

  ensureDir();
  deleteFile(existing.image_url);

  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const filename = `${productId}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);

  const { data, error } = await repo.update(productId, { image_url: buildPublicUrl(filename) });
  if (error || !data) throw new Error("FAILED_TO_UPDATE_PRODUCT");
  return data;
};

exports.removeImage = async (productId) => {
  const { data: existing } = await repo.findById(productId);
  if (!existing) throw new Error("PRODUCT_NOT_FOUND");

  deleteFile(existing.image_url);

  const { data, error } = await repo.update(productId, { image_url: null });
  if (error) throw new Error("FAILED_TO_UPDATE_PRODUCT");
  return data;
};

exports.getProductInsights = async (productId, dateRange) => {
  const [{ data: product, error: pErr }, purchases, sales] = await Promise.all([
    repo.findById(productId),
    exports.getPurchaseHistory(productId, dateRange),
    exports.getSalesHistory(productId, dateRange),
  ]);

  if (pErr || !product) throw new Error("PRODUCT_NOT_FOUND");

  // Purchase aggregates
  const totalUnitsPurchased = purchases.reduce(
    (s, p) => s + (p.quantity || 0),
    0,
  );
  const totalCostPurchased = purchases.reduce(
    (s, p) => s + (p.line_total || 0),
    0,
  );
  const avgCostPrice =
    totalUnitsPurchased > 0
      ? totalCostPurchased / totalUnitsPurchased
      : product.cost_price || 0;

  // Sales aggregates
  const totalUnitsSold = sales.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalRevenue = sales.reduce(
    (s, r) => s + (r.quantity || 0) * (r.price || 0),
    0,
  );

  // Profitability
  const totalCOGS = totalUnitsSold * avgCostPrice;
  const grossProfit = totalRevenue - totalCOGS;
  const profitMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Average daily sales & shelf life estimate
  const sortedSales = [...sales].sort(
    (a, b) => new Date(a.sale_date || 0) - new Date(b.sale_date || 0),
  );
  const firstSaleDate =
    sortedSales.length > 0 && sortedSales[0].sale_date
      ? new Date(sortedSales[0].sale_date)
      : null;
  const daysSinceFirstSale = firstSaleDate
    ? Math.max(1, Math.ceil((Date.now() - firstSaleDate.getTime()) / 86400000))
    : 1;
  const avgDailySales = totalUnitsSold / daysSinceFirstSale;
  const daysOfStockRemaining =
    avgDailySales > 0
      ? Math.floor(product.current_stock / avgDailySales)
      : null;

  return {
    product,
    metrics: {
      current_stock: product.current_stock,
      total_units_purchased: totalUnitsPurchased,
      total_units_sold: totalUnitsSold,
      total_revenue: totalRevenue,
      total_cogs: totalCOGS,
      gross_profit: grossProfit,
      profit_margin: Number(profitMargin).toFixed(2),
      avg_daily_sales: Number(avgDailySales).toFixed(2),
      days_of_stock_remaining: daysOfStockRemaining,
      avg_cost_price: Number(avgCostPrice).toFixed(2),
    },
  };
};

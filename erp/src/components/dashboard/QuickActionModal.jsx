import { useState } from "react";
import { useNavigate } from "react-router";
import { X, ShoppingCart, Package, AlertTriangle, Users, DollarSign, Send, Printer, Download, Tag, TrendingUp, Scissors } from "lucide-react";
import * as XLSX from "xlsx";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const QuickActionModal = ({ type, data, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("list");
  const navigate = useNavigate();

  if (!isOpen) return null;

  const renderEmergencyReorder = () => {
    const lowStock = data?.stockItems?.filter(
      (s) => s.reorder_level > 0 && s.current_stock > 0 && s.current_stock <= s.reorder_level
    ) || [];
    const outOfStock = data?.stockItems?.filter((s) => s.current_stock <= 0) || [];

    const suggestedQty = (item) =>
      item.reorder_level > 0
        ? Math.max(item.reorder_level * 2 - (item.current_stock || 0), item.reorder_level)
        : 10;

    const handleCreatePO = () => {
      const initialLines = [...outOfStock, ...lowStock].map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: suggestedQty(item),
        unit_cost: item.cost_price || 0,
      }));
      onClose();
      navigate("/inventory/receive", { state: { initialLines } });
    };

    const handleExport = () => {
      const rows = [
        ...outOfStock.map((item) => ({
          Product: item.name,
          Category: item.categories?.name || "Uncategorized",
          Unit: item.unit || "",
          "Current Stock": item.current_stock,
          "Reorder Level": item.reorder_level || "",
          "Suggested Qty": suggestedQty(item),
          "Last Cost (KES)": item.cost_price || "",
          "Estimated Total (KES)": item.cost_price
            ? suggestedQty(item) * item.cost_price
            : "",
          Status: "Out of Stock",
        })),
        ...lowStock.map((item) => ({
          Product: item.name,
          Category: item.categories?.name || "Uncategorized",
          Unit: item.unit || "",
          "Current Stock": item.current_stock,
          "Reorder Level": item.reorder_level || "",
          "Suggested Qty": suggestedQty(item),
          "Last Cost (KES)": item.cost_price || "",
          "Estimated Total (KES)": item.cost_price
            ? suggestedQty(item) * item.cost_price
            : "",
          Status: "Low Stock",
        })),
      ];

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 30 }, // Product
        { wch: 20 }, // Category
        { wch: 10 }, // Unit
        { wch: 14 }, // Current Stock
        { wch: 14 }, // Reorder Level
        { wch: 14 }, // Suggested Qty
        { wch: 18 }, // Last Cost
        { wch: 22 }, // Estimated Total
        { wch: 14 }, // Status
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reorder List");
      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `reorder-list-${date}.xlsx`);
    };

    return (
      <div className="space-y-4">
        {/* Critical Stockouts */}
        {outOfStock.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle size={16} />
              CRITICAL: Out of Stock ({outOfStock.length} items)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {outOfStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-surface-800 rounded">
                  <div>
                    <p className="text-sm text-white">{item.name}</p>
                    <p className="text-xs text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">Last Cost</p>
                    <p className="text-sm text-white">{formatCurrency(item.cost_price || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock */}
        {lowStock.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
              <Package size={16} />
              Low Stock Alert ({lowStock.length} items)
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-surface-800 rounded">
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${Math.min((item.current_stock / (item.reorder_level || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-400">
                        {item.current_stock} / {item.reorder_level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-surface-400">Suggested Qty</p>
                    <p className="text-sm text-white">{(item.reorder_level) * 3 - item.current_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-surface-700">
          <button
            onClick={handleCreatePO}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <ShoppingCart size={16} />
            Create Purchase Order
          </button>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            Export List
          </button>
        </div>
      </div>
    );
  };

  const renderDeadStock = () => {
    const movement = data?.movementAnalysis || [];
    const slowItems = movement.filter((m) => m.movement_category === "SLOW" && m.current_stock > 0);
    const nonMovingItems = movement.filter((m) => m.movement_category === "NON_MOVING" && m.current_stock > 0);

    const slowValue = slowItems.reduce((sum, s) => sum + Number(s.stock_value || 0), 0);
    const nonMovingValue = nonMovingItems.reduce((sum, s) => sum + Number(s.stock_value || 0), 0);
    const totalDeadValue = slowValue + nonMovingValue;
    const totalItems = slowItems.length + nonMovingItems.length;

    const getCategoryBadge = (cat) => {
      if (cat === "NON_MOVING") return { label: "Non-Moving", cls: "bg-red-500/20 text-red-400" };
      return { label: "Slow", cls: "bg-orange-500/20 text-orange-400" };
    };

    const renderItemList = (items, max = 10) =>
      items.slice(0, max).map((item) => {
        const badge = getCategoryBadge(item.movement_category);
        return (
          <div key={item.product_id} className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white truncate">{item.product_name}</p>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-surface-500">{item.category_name || "Uncategorized"}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-surface-400">Stock: {item.current_stock} {item.unit || "units"}</span>
                <span className="text-xs text-surface-400">
                  {item.days_since_last_sale >= 9999
                    ? "Never sold"
                    : `Last sale: ${item.days_since_last_sale} days ago`}
                </span>
              </div>
            </div>
            <div className="text-right ml-3 shrink-0">
              <p className="text-sm font-semibold text-orange-400">{formatCurrency(Number(item.stock_value || 0))}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">locked value</p>
            </div>
          </div>
        );
      });

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Non-Moving</p>
            <p className="text-lg font-bold text-red-400">{nonMovingItems.length}</p>
            <p className="text-[10px] text-surface-500">{formatCurrency(nonMovingValue)}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Slow Moving</p>
            <p className="text-lg font-bold text-orange-400">{slowItems.length}</p>
            <p className="text-[10px] text-surface-500">{formatCurrency(slowValue)}</p>
          </div>
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Total Trapped</p>
            <p className="text-lg font-bold text-white">{formatCurrency(totalDeadValue)}</p>
            <p className="text-[10px] text-surface-500">{totalItems} items</p>
          </div>
        </div>

        {/* Item list — non-moving first, then slow */}
        {totalItems === 0 ? (
          <div className="py-8 text-center text-surface-400 text-sm">
            <Package size={24} className="mx-auto mb-2 text-surface-600" />
            No slow or non-moving stock detected.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {renderItemList([...nonMovingItems, ...slowItems])}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-surface-700">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
            <DollarSign size={16} />
            Create Clearance Sale
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors">
            <Package size={16} />
            Bundle Products
          </button>
        </div>
      </div>
    );
  };

  const renderCollections = () => {
    const outstanding = data?.outstandingBills || [];
    const critical = outstanding.filter((b) => {
      const days = Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
      return days > 30;
    });
    const totalCritical = critical.reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0);

    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            Critical Collections Required
          </h4>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalCritical)}</p>
          <p className="text-xs text-surface-500">{critical.length} bills overdue 30+ days</p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {critical.slice(0, 10).map((bill, index) => {
            const balance = Number(bill.bill_total) - Number(bill.paid_amount || 0);
            const days = Math.ceil((new Date() - new Date(bill.created_at)) / (1000 * 60 * 60 * 24));
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <div>
                  <p className="text-sm text-white">{bill.customer_name || "Walk-in Customer"}</p>
                  <p className="text-xs text-surface-500">Bill: {bill.bill_id?.slice(0, 8)}...</p>
                  <p className="text-xs text-red-400 mt-1">{days} days overdue</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400">{formatCurrency(balance)}</p>
                  <button className="text-xs text-primary-400 hover:text-primary-300 mt-1 flex items-center gap-1">
                    <Send size={10} />
                    Send Reminder
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-surface-700">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <Send size={16} />
            Bulk Reminder SMS
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors">
            <Printer size={16} />
            Print Statements
          </button>
        </div>
      </div>
    );
  };

  const renderStaffActions = () => {
    const staff = data?.staffPerformance || [];
    const underperformers = staff.filter((s) => {
      const target = Number(s.target_revenue || 50000);
      const actual = Number(s.total_revenue || 0);
      return actual < target * 0.7 && Number(s.total_bills) > 0;
    });

    return (
      <div className="space-y-4">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
            <Users size={16} />
            Performance Review Required
          </h4>
          <p className="text-2xl font-bold text-white mt-2">{underperformers.length} Staff Members</p>
          <p className="text-xs text-surface-500">Below 70% of sales target</p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {underperformers.map((staff, index) => {
            const target = Number(staff.target_revenue || 50000);
            const actual = Number(staff.total_revenue || 0);
            const pct = (actual / target) * 100;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <div>
                  <p className="text-sm text-white">{staff.user_name}</p>
                  <p className="text-xs text-surface-500">{staff.total_bills} bills processed</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-orange-400">{pct.toFixed(0)}% of target</p>
                  <p className="text-xs text-surface-500">Gap: {formatCurrency(target - actual)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-surface-700">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <Users size={16} />
            Schedule Training
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors">
            <DollarSign size={16} />
            Adjust Targets
          </button>
        </div>
      </div>
    );
  };

  const TARGET_MARGIN = data?.grossMarginTarget ?? 35; // % — configurable in Settings → Business Targets

  const renderCheckAlternatives = () => {
    const stockItems = data?.stockItems || [];
    const outOfStock = stockItems.filter((s) => s.current_stock <= 0);
    const inStock = stockItems.filter((s) => s.current_stock > 0);

    if (outOfStock.length === 0) {
      return (
        <div className="py-10 text-center text-surface-400 text-sm">
          <Package size={24} className="mx-auto mb-2 text-surface-600" />
          No out-of-stock products at the moment.
        </div>
      );
    }

    // For each out-of-stock item, find alternatives in the same category
    const grouped = outOfStock.map((item) => {
      const alternatives = inStock
        .filter((s) => s.category_id === item.category_id && s.id !== item.id)
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 3);
      return { item, alternatives };
    });

    const withAlternatives = grouped.filter((g) => g.alternatives.length > 0);
    const noAlternatives = grouped.filter((g) => g.alternatives.length === 0);

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Out of Stock</p>
            <p className="text-lg font-bold text-red-400">{outOfStock.length}</p>
            <p className="text-[10px] text-surface-500">products</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Have Alternatives</p>
            <p className="text-lg font-bold text-emerald-400">{withAlternatives.length}</p>
            <p className="text-[10px] text-surface-500">can substitute</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">No Substitute</p>
            <p className="text-lg font-bold text-orange-400">{noAlternatives.length}</p>
            <p className="text-[10px] text-surface-500">reorder urgently</p>
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {/* Items with alternatives first */}
          {withAlternatives.map(({ item, alternatives }) => (
            <div key={item.id} className="rounded-lg border border-surface-700 overflow-hidden">
              {/* Out-of-stock item header */}
              <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-surface-700">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 ml-2">
                  Out of Stock
                </span>
              </div>
              {/* Alternatives */}
              <div className="divide-y divide-surface-700/50 bg-surface-800/30">
                {alternatives.map((alt) => (
                  <div key={alt.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-surface-200 truncate">{alt.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {alt.price > 0 && (
                        <span className="text-[11px] text-surface-400">{formatCurrency(alt.price)}</span>
                      )}
                      <span className="text-[11px] font-medium text-emerald-400">
                        {alt.current_stock} {alt.unit || "in stock"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Items with no alternatives */}
          {noAlternatives.length > 0 && (
            <div className="rounded-lg border border-orange-500/30 overflow-hidden">
              <div className="px-3 py-2 bg-orange-500/10 border-b border-surface-700">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                  No In-Category Alternatives — Reorder Required
                </p>
              </div>
              <div className="divide-y divide-surface-700/50 bg-surface-800/30">
                {noAlternatives.map(({ item }) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs text-surface-300">{item.name}</p>
                    <span className="text-[11px] text-surface-500">{item.categories?.name || "Uncategorized"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-surface-700">
          <p className="text-[11px] text-surface-500">
            Alternatives are same-category products currently in stock. Brief staff on these substitutes before the next service.
          </p>
        </div>
      </div>
    );
  };

  const renderReviewPricing = () => {
    const items = (data?.stockItems || [])
      .filter((s) => s.price > 0 && s.cost_price > 0)
      .map((s) => ({
        ...s,
        margin: ((s.price - s.cost_price) / s.price) * 100,
        suggestedPrice: s.cost_price / (1 - TARGET_MARGIN / 100),
      }))
      .filter((s) => s.margin < TARGET_MARGIN)
      .sort((a, b) => a.margin - b.margin);

    const critical = items.filter((s) => s.margin < 20);
    const warning = items.filter((s) => s.margin >= 20 && s.margin < TARGET_MARGIN);

    if (items.length === 0) {
      return (
        <div className="py-10 text-center text-surface-400 text-sm">
          <Tag size={24} className="mx-auto mb-2 text-surface-600" />
          All tracked products are priced above the {TARGET_MARGIN}% margin target.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Critical (&lt;20%)</p>
            <p className="text-lg font-bold text-red-400">{critical.length}</p>
            <p className="text-[10px] text-surface-500">products</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Below {TARGET_MARGIN}%</p>
            <p className="text-lg font-bold text-orange-400">{warning.length}</p>
            <p className="text-[10px] text-surface-500">products</p>
          </div>
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Target Margin</p>
            <p className="text-lg font-bold text-white">{TARGET_MARGIN}%</p>
            <p className="text-[10px] text-surface-500">gross margin</p>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => {
            const isRed = item.margin < 20;
            return (
              <div key={item.id} className="p-3 bg-surface-800 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${isRed ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                    {item.margin.toFixed(1)}% margin
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-surface-500">Selling Price</p>
                    <p className="text-white font-medium">{formatCurrency(item.price)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Cost Price</p>
                    <p className="text-white font-medium">{formatCurrency(item.cost_price)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Price for {TARGET_MARGIN}%</p>
                    <p className="text-emerald-400 font-medium">{formatCurrency(Math.ceil(item.suggestedPrice))}</p>
                  </div>
                </div>
                {/* Margin bar */}
                <div className="mt-2">
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isRed ? "bg-red-400" : "bg-orange-400"}`}
                      style={{ width: `${Math.max(Math.min((item.margin / TARGET_MARGIN) * 100, 100), 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-surface-700">
          <p className="text-[11px] text-surface-500">
            Suggested price calculated at {TARGET_MARGIN}% gross margin target. Adjust based on market conditions.
          </p>
        </div>
      </div>
    );
  };

  const renderCutCosts = () => {
    const items = (data?.stockItems || [])
      .filter((s) => s.cost_price > 0)
      .map((s) => ({
        ...s,
        stockValue: (s.cost_price || 0) * (s.current_stock || 0),
        margin: s.price > 0 ? ((s.price - s.cost_price) / s.price) * 100 : null,
      }))
      .sort((a, b) => b.cost_price - a.cost_price)
      .slice(0, 20);

    const totalStockValue = items.reduce((sum, s) => sum + s.stockValue, 0);
    const maxCost = items[0]?.cost_price || 1;

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
            <Scissors size={15} />
            Top Cost Contributors
          </h4>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalStockValue)}</p>
          <p className="text-xs text-surface-500">Total inventory value in these {items.length} products</p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="p-3 bg-surface-800 rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{item.name}</p>
                  <p className="text-xs text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{formatCurrency(item.cost_price)}</p>
                  <p className="text-[10px] text-surface-500">unit cost</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-surface-400">
                  Stock: {item.current_stock} {item.unit || "units"}
                  {item.stockValue > 0 && <span className="text-orange-400 ml-1">= {formatCurrency(item.stockValue)}</span>}
                </span>
                {item.margin !== null && (
                  <span className={item.margin < 20 ? "text-red-400" : item.margin < TARGET_MARGIN ? "text-orange-400" : "text-emerald-400"}>
                    {item.margin.toFixed(1)}% margin
                  </span>
                )}
              </div>
              {/* Cost bar relative to highest-cost item */}
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${(item.cost_price / maxCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-surface-700">
          <p className="text-[11px] text-surface-500">
            Focus supplier negotiations on high-cost, low-margin items. Reducing cost by 5% on top items has the biggest GP impact.
          </p>
        </div>
      </div>
    );
  };

  const renderHighMarginProducts = () => {
    const topSellerIds = new Set((data?.topSellingProducts || []).map((p) => p.product_id));

    const items = (data?.stockItems || [])
      .filter((s) => s.price > 0 && s.cost_price > 0)
      .map((s) => ({
        ...s,
        margin: ((s.price - s.cost_price) / s.price) * 100,
        isTopSeller: topSellerIds.has(s.id),
      }))
      .filter((s) => s.margin >= TARGET_MARGIN)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 20);

    const opportunities = items.filter((s) => !s.isTopSeller);
    const alreadyTop = items.filter((s) => s.isTopSeller);

    if (items.length === 0) {
      return (
        <div className="py-10 text-center text-surface-400 text-sm">
          <TrendingUp size={24} className="mx-auto mb-2 text-surface-600" />
          No products with {TARGET_MARGIN}%+ margin found. Add cost prices to products to see this analysis.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Push Opportunities</p>
            <p className="text-lg font-bold text-emerald-400">{opportunities.length}</p>
            <p className="text-[10px] text-surface-500">high-margin, low sales</p>
          </div>
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-400">Already Top Sellers</p>
            <p className="text-lg font-bold text-primary-400">{alreadyTop.length}</p>
            <p className="text-[10px] text-surface-500">high-margin &amp; selling well</p>
          </div>
        </div>

        {opportunities.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              Opportunities — Push These More
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {opportunities.map((item) => (
                <div key={item.id} className="p-3 bg-surface-800 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{item.name}</p>
                      <p className="text-xs text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-400">{item.margin.toFixed(1)}%</p>
                      <p className="text-[10px] text-surface-500">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${Math.min(item.margin, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alreadyTop.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
              High-Margin Top Sellers — Keep Stocked
            </p>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {alreadyTop.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-surface-500">{item.categories?.name || "Uncategorized"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary-400">{item.margin.toFixed(1)}%</p>
                    <p className="text-[10px] text-surface-500">{formatCurrency(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-surface-700">
          <p className="text-[11px] text-surface-500">
            "Opportunities" are high-margin products not currently in your top sellers. Train staff to recommend these and ensure they are always visible and in stock.
          </p>
        </div>
      </div>
    );
  };

  const titles = {
    "emergency-reorder": { title: "Emergency Stock Reorder", icon: ShoppingCart },
    "check-alternatives": { title: "Check Alternatives", icon: Package },
    "dead-stock": { title: "Dead Stock Clearance", icon: Package },
    "collections": { title: "Critical Collections", icon: DollarSign },
    "staff-actions": { title: "Staff Performance Actions", icon: Users },
    "review-pricing": { title: "Review Pricing", icon: Tag },
    "cut-costs": { title: "Cut Costs", icon: Scissors },
    "high-margin": { title: "Focus High-Margin Products", icon: TrendingUp },
  };

  const config = titles[type] || { title: "Quick Action", icon: AlertTriangle };
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              type === "emergency-reorder" ? "bg-red-500/20 text-red-400" :
              type === "check-alternatives" ? "bg-blue-500/20 text-blue-400" :
              type === "dead-stock" ? "bg-orange-500/20 text-orange-400" :
              type === "collections" ? "bg-red-500/20 text-red-400" :
              type === "review-pricing" ? "bg-orange-500/20 text-orange-400" :
              type === "cut-costs" ? "bg-orange-500/20 text-orange-400" :
              type === "high-margin" ? "bg-emerald-500/20 text-emerald-400" :
              "bg-primary-500/20 text-primary-400"
            }`}>
              <Icon size={18} />
            </div>
            <h3 className="text-lg font-semibold text-white">{config.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {type === "emergency-reorder" && renderEmergencyReorder()}
          {type === "check-alternatives" && renderCheckAlternatives()}
          {type === "dead-stock" && renderDeadStock()}
          {type === "collections" && renderCollections()}
          {type === "staff-actions" && renderStaffActions()}
          {type === "review-pricing" && renderReviewPricing()}
          {type === "cut-costs" && renderCutCosts()}
          {type === "high-margin" && renderHighMarginProducts()}
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;

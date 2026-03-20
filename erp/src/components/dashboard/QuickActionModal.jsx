import { useState } from "react";
import { X, ShoppingCart, Package, AlertTriangle, Users, DollarSign, Send, Printer, Download } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const QuickActionModal = ({ type, data, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("list");

  if (!isOpen) return null;

  const renderEmergencyReorder = () => {
    const lowStock = data?.stockItems?.filter(
      (s) => s.reorder_level > 0 && s.current_stock > 0 && s.current_stock <= s.reorder_level
    ) || [];
    const outOfStock = data?.stockItems?.filter((s) => s.current_stock <= 0) || [];

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
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <ShoppingCart size={16} />
            Create Purchase Order
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors">
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

  const titles = {
    "emergency-reorder": { title: "Emergency Stock Reorder", icon: ShoppingCart },
    "dead-stock": { title: "Dead Stock Clearance", icon: Package },
    "collections": { title: "Critical Collections", icon: DollarSign },
    "staff-actions": { title: "Staff Performance Actions", icon: Users },
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
              type === "dead-stock" ? "bg-orange-500/20 text-orange-400" :
              type === "collections" ? "bg-red-500/20 text-red-400" :
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
          {type === "dead-stock" && renderDeadStock()}
          {type === "collections" && renderCollections()}
          {type === "staff-actions" && renderStaffActions()}
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;

import { useMemo } from "react";
import { Package, AlertTriangle, TrendingUp, ArrowRight, RotateCcw, ShoppingCart, Clock } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const InventoryAlerts = ({ data }) => {
  const inventory = useMemo(() => {
    if (!data || !data.stockItems) return null;

    const stockItems = data.stockItems;
    const totalProducts = stockItems.length;
    
    // Low stock items (below reorder point)
    const lowStockItems = stockItems
      .filter((item) => item.current_stock <= (item.reorder_point || 10) && item.current_stock > 0)
      .sort((a, b) => (a.current_stock / (a.reorder_point || 1)) - (b.current_stock / (b.reorder_point || 1)))
      .slice(0, 5);

    // Out of stock items
    const outOfStockItems = stockItems.filter((item) => item.current_stock <= 0).slice(0, 5);

    // Overstock items (excess inventory)
    const overstockItems = stockItems
      .filter((item) => item.current_stock > (item.reorder_point || 10) * 3)
      .sort((a, b) => b.current_stock - a.current_stock)
      .slice(0, 3);

    // Inventory value
    const totalInventoryValue = stockItems.reduce(
      (sum, item) => sum + item.current_stock * (item.average_cost || item.cost_price || 0),
      0
    );

    // Calculate turnover for top selling items
    const topSellingWithTurnover = (data.topSellingProducts || [])
      .slice(0, 5)
      .map((product) => {
        const stockItem = stockItems.find((s) => s.product_id === product.product_id);
        const currentStock = stockItem?.current_stock || 0;
        const avgCost = stockItem?.average_cost || stockItem?.cost_price || product.cost_price || 0;
        const monthlySales = Number(product.total_quantity) || 0;
        const stockValue = currentStock * avgCost;
        const turnoverRatio = stockValue > 0 ? (monthlySales * avgCost) / stockValue : 0;
        const daysOfInventory = monthlySales > 0 ? (currentStock / monthlySales) * 30 : 0;
        
        return {
          ...product,
          currentStock,
          stockValue,
          turnoverRatio,
          daysOfInventory,
          avgCost,
        };
      });

    // Average turnover ratio
    const avgTurnover = topSellingWithTurnover.length > 0
      ? topSellingWithTurnover.reduce((sum, p) => sum + p.turnoverRatio, 0) / topSellingWithTurnover.length
      : 0;

    // Dead stock identification (high stock, low sales)
    const deadStockCandidates = stockItems
      .filter((item) => item.current_stock > 20)
      .map((item) => {
        const sales = (data.topSellingProducts || []).find((p) => p.product_id === item.product_id);
        return {
          ...item,
          monthlySales: sales ? Number(sales.total_quantity) : 0,
          stockValue: item.current_stock * (item.average_cost || item.cost_price || 0),
        };
      })
      .filter((item) => item.monthlySales < 5 && item.stockValue > 5000)
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 3);

    return {
      totalProducts,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      overstockCount: overstockItems.length,
      lowStockItems,
      outOfStockItems,
      overstockItems,
      totalInventoryValue,
      topSellingWithTurnover,
      avgTurnover,
      deadStockCandidates,
    };
  }, [data]);

  if (!inventory) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-400">
        <p>No inventory data available</p>
      </div>
    );
  }

  // Decision support recommendations
  const recommendations = [];
  if (inventory.outOfStockCount > 0) {
    recommendations.push({
      type: "critical",
      message: `${inventory.outOfStockCount} products out of stock. Lost sales opportunity - reorder immediately.`,
      action: "View Products",
    });
  }
  if (inventory.lowStockCount > 3) {
    recommendations.push({
      type: "warning",
      message: `${inventory.lowStockCount} products below reorder point. Create purchase order to avoid stockouts.`,
      action: "Create PO",
    });
  }
  if (inventory.avgTurnover < 2) {
    recommendations.push({
      type: "info",
      message: `Low inventory turnover (${inventory.avgTurnover.toFixed(1)}x). Consider promotions to move slow stock.`,
      action: "View Analysis",
    });
  }
  if (inventory.deadStockCandidates.length > 0) {
    const deadValue = inventory.deadStockCandidates.reduce((sum, i) => sum + i.stockValue, 0);
    recommendations.push({
      type: "warning",
      message: `${formatCurrency(deadValue)} tied in dead stock. Consider discounting or bundling to clear inventory.`,
      action: "View Dead Stock",
    });
  }

  const getTurnoverHealth = (ratio) => {
    if (ratio >= 6) return { label: "Excellent", color: "text-emerald-400" };
    if (ratio >= 4) return { label: "Good", color: "text-blue-400" };
    if (ratio >= 2) return { label: "Fair", color: "text-orange-400" };
    return { label: "Poor", color: "text-red-400" };
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-surface-800/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{inventory.totalProducts}</p>
          <p className="text-[10px] text-surface-500">Products</p>
        </div>
        <div className={`rounded-lg p-2 text-center ${inventory.outOfStockCount > 0 ? "bg-red-500/15" : "bg-surface-800/50"}`}>
          <p className={`text-lg font-bold ${inventory.outOfStockCount > 0 ? "text-red-400" : "text-white"}`}>
            {inventory.outOfStockCount}
          </p>
          <p className="text-[10px] text-surface-500">Out of Stock</p>
        </div>
        <div className={`rounded-lg p-2 text-center ${inventory.lowStockCount > 3 ? "bg-orange-500/15" : "bg-surface-800/50"}`}>
          <p className={`text-lg font-bold ${inventory.lowStockCount > 3 ? "text-orange-400" : "text-white"}`}>
            {inventory.lowStockCount}
          </p>
          <p className="text-[10px] text-surface-500">Low Stock</p>
        </div>
        <div className="bg-surface-800/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-emerald-400">{inventory.avgTurnover.toFixed(1)}x</p>
          <p className="text-[10px] text-surface-500">Turnover</p>
        </div>
      </div>

      {/* Inventory Value */}
      <div className="flex items-center justify-between bg-surface-800/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-primary-400" />
          <span className="text-xs text-surface-400">Total Inventory Value</span>
        </div>
        <span className="text-sm font-semibold text-white">{formatCurrency(inventory.totalInventoryValue)}</span>
      </div>

      {/* Critical Stock Alerts */}
      {(inventory.outOfStockItems.length > 0 || inventory.lowStockItems.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Stock Alerts</p>
          
          {/* Out of Stock */}
          {inventory.outOfStockItems.map((item, index) => (
            <div key={`oos-${index}`} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs text-surface-300 truncate">{item.product_name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full shrink-0">OUT</span>
            </div>
          ))}

          {/* Low Stock */}
          {inventory.lowStockItems.slice(0, 3).map((item, index) => (
            <div key={`low-${index}`} className="flex items-center justify-between p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} className="text-orange-400 shrink-0" />
                <span className="text-xs text-surface-300 truncate">{item.product_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-surface-500">
                  {item.current_stock} / {item.reorder_point || 10}
                </span>
                <div className="w-12 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${Math.min((item.current_stock / (item.reorder_point || 10)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {inventory.lowStockItems.length > 3 && (
            <p className="text-xs text-surface-500 text-center">+{inventory.lowStockItems.length - 3} more items</p>
          )}
        </div>
      )}

      {/* Top Products Turnover */}
      {inventory.topSellingWithTurnover.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Top Products Performance</p>
          {inventory.topSellingWithTurnover.map((product, index) => {
            const health = getTurnoverHealth(product.turnoverRatio);
            return (
              <div key={index} className="flex items-center justify-between p-2 bg-surface-800/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-surface-300 truncate">{product.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-surface-500">Stock: {product.currentStock}</span>
                    <span className="text-[10px] text-surface-500">•</span>
                    <span className="text-[10px] text-surface-500">{product.daysOfInventory.toFixed(0)} days</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${health.color}`}>{product.turnoverRatio.toFixed(1)}x</p>
                  <p className="text-[10px] text-surface-500">turnover</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Support Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Recommendations</p>
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                rec.type === "critical"
                  ? "bg-red-500/10 border border-red-500/20"
                  : rec.type === "warning"
                    ? "bg-orange-500/10 border border-orange-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
              }`}
            >
              {rec.type === "critical" ? (
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
              ) : rec.type === "warning" ? (
                <ShoppingCart size={14} className="shrink-0 mt-0.5 text-orange-400" />
              ) : (
                <RotateCcw size={14} className="shrink-0 mt-0.5 text-blue-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-surface-300">{rec.message}</p>
                {rec.action && (
                  <button className="mt-1.5 text-[10px] px-2 py-1 bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 transition-colors">
                    {rec.action}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dead Stock Warning */}
      {inventory.deadStockCandidates.length > 0 && (
        <div className="p-2.5 bg-surface-800/30 border border-surface-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-orange-400" />
            <span className="text-xs font-medium text-surface-400">Dead Stock Alert</span>
          </div>
          <p className="text-xs text-surface-500 mb-2">
            {inventory.deadStockCandidates.length} items with high stock but low sales
          </p>
          <div className="space-y-1">
            {inventory.deadStockCandidates.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-surface-400 truncate">{item.product_name}</span>
                <span className="text-orange-400">{formatCurrency(item.stockValue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAlerts;

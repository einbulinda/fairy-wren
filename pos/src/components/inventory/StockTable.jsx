import { useState, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const isLowStock = (item) =>
  item.current_stock > 0 && item.reorder_level > 0 && item.current_stock <= item.reorder_level;

const StockTable = ({ stock, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-gray-500" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="text-purple-400" />
    ) : (
      <ArrowDown size={14} className="text-purple-400" />
    );
  };

  // Filter and sort products
  const filteredAndSortedStock = useMemo(() => {
    let filtered = stock;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "category":
          aValue = (a.category?.name || "").toLowerCase();
          bValue = (b.category?.name || "").toLowerCase();
          break;
        case "current_stock":
          aValue = a.current_stock || 0;
          bValue = b.current_stock || 0;
          break;
        case "cost_price":
          aValue = a.cost_price || 0;
          bValue = b.cost_price || 0;
          break;
        case "value":
          aValue = (a.cost_price || 0) * (a.current_stock || 0);
          bValue = (b.cost_price || 0) * (b.current_stock || 0);
          break;
        case "status": {
          const getStatusValue = (item) => {
            if (item.current_stock <= 0) return 0;
            if (isLowStock(item)) return 1;
            return 2;
          };
          aValue = getStatusValue(a);
          bValue = getStatusValue(b);
          break;
        }
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [stock, searchTerm, sortConfig]);

  // Get stock status
  const getStockStatus = (item) => {
    if (item.current_stock <= 0) {
      return {
        icon: <XCircle size={16} />,
        text: "Out of Stock",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
      };
    } else if (isLowStock(item)) {
      return {
        icon: <AlertTriangle size={16} />,
        text: "Low Stock",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
      };
    } else {
      return {
        icon: <CheckCircle size={16} />,
        text: "In Stock",
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Product Inventory
            </h3>
            <p className="text-sm text-gray-400">
              {filteredAndSortedStock.length} product
              {filteredAndSortedStock.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search products or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-gray-900/60 backdrop-blur-md border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
            size={18}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-purple-500/20">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-900/60 backdrop-blur-md border-b-2 border-purple-500/20">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Product
                    {getSortIcon("name")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("category")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Category
                    {getSortIcon("category")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("current_stock")}
                    className="flex items-center gap-2 ml-auto text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Stock Level
                    {getSortIcon("current_stock")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("cost_price")}
                    className="flex items-center gap-2 ml-auto text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Cost Price
                    {getSortIcon("cost_price")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("value")}
                    className="flex items-center gap-2 ml-auto text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Total Value
                    {getSortIcon("value")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-2 mx-auto text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Status
                    {getSortIcon("status")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredAndSortedStock.length > 0 ? (
                filteredAndSortedStock.map((item) => {
                  const status = getStockStatus(item);
                  const totalValue =
                    (item.cost_price || 0) * (item.current_stock || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-800/40 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                            <Package size={20} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-300">
                          {item.categories?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`text-lg font-bold ${
                            item.current_stock <= 0
                              ? "text-red-400"
                              : isLowStock(item)
                              ? "text-orange-400"
                              : "text-green-400"
                          }`}
                        >
                          {item.current_stock || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono text-sm text-purple-400">
                          KSh {(item.cost_price || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono font-semibold text-pink-400">
                          KSh {totalValue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${status.color} ${status.bgColor} border ${status.borderColor}`}
                          >
                            {status.icon}
                            {status.text}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400">No products found</p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-2 text-purple-400 hover:text-purple-300 text-sm underline"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-purple-500/10">
          {filteredAndSortedStock.length > 0 ? (
            filteredAndSortedStock.map((item) => {
              const status = getStockStatus(item);
              const totalValue =
                (item.cost_price || 0) * (item.current_stock || 0);

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-800/40 transition-colors"
                >
                  {/* Product Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Package size={24} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white mb-1 truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {item.category?.name || "Uncategorized"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${status.color} ${status.bgColor} border ${status.borderColor} shrink-0 ml-2`}
                    >
                      {status.icon}
                      <span className="hidden sm:inline">{status.text}</span>
                    </span>
                  </div>

                  {/* Product Details Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/40 rounded-lg p-3 border border-purple-500/10">
                      <p className="text-xs text-gray-400 mb-1">Stock Level</p>
                      <p
                        className={`text-lg font-bold ${
                          item.current_stock === 0
                            ? "text-red-400"
                            : isLowStock(item)
                            ? "text-orange-400"
                            : "text-green-400"
                        }`}
                      >
                        {item.current_stock || 0}
                      </p>
                    </div>
                    <div className="bg-gray-900/40 rounded-lg p-3 border border-purple-500/10">
                      <p className="text-xs text-gray-400 mb-1">Cost Price</p>
                      <p className="text-sm font-mono font-semibold text-purple-400">
                        KSh {(item.cost_price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-900/40 rounded-lg p-3 border border-purple-500/10">
                      <p className="text-xs text-gray-400 mb-1">Total Value</p>
                      <p className="text-sm font-mono font-semibold text-pink-400">
                        KSh {totalValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 mb-2">No products found</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Info */}
      {searchTerm && filteredAndSortedStock.length > 0 && (
        <div className="text-sm text-gray-400 text-center">
          Showing {filteredAndSortedStock.length} of {stock.length} products
        </div>
      )}
    </div>
  );
};

export default StockTable;

// InventoryManagement.jsx (Enhanced with Tabs)
import { useState, useMemo, useEffect } from "react";
import { useStockTake } from "../hooks/inventory/useStockTake";
import { fetchSuppliers } from "../services/suppliers.service";
import { useReceiveInventory } from "../hooks/inventory/useReceiveInventory";
import { useAuth } from "../hooks/useAuth";
import {
  Package,
  TruckIcon,
  ChartNoAxesCombined,
  ClipboardCheck,
} from "lucide-react";
import StockTable from "../components/inventory/StockTable";
import StockTakeView from "../components/inventory/StockTakeView";
import StockTakeReports from "../components/inventory/StockTakeReports";
import ReceiveInventoryTab from "../components/inventory/ReceiveInventoryTab";
import ApprovalTab from "../components/inventory/ApprovalTab";
import { useProducts } from "@/hooks/useProducts";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const InventoryManagement = () => {
  const { user } = useAuth();
  const { products: stock, loading: productsLoading } = useProducts({
    active: true,
  });
  const { stockTake, startStockTake, saveItems, completeStockTake } =
    useStockTake();
  const [suppliers, setSuppliers] = useState([]);
  const { receiveInventory } = useReceiveInventory();

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const [activeTab, setActiveTab] = useState("stock"); // 'stock' | 'receive' | 'reports' | 'approvals'
  const [showStockTake, setShowStockTake] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const total = stock.length;
    const lowStock = stock.filter((p) => p.current_stock <= 5).length;
    const outOfStock = stock.filter((p) => p.current_stock === 0).length;
    const totalValue = stock.reduce(
      (sum, p) => sum + (p.cost_price || 0) * p.current_stock,
      0,
    );

    return { total, lowStock, outOfStock, totalValue };
  }, [stock]);

  const handleStockTake = async () => {
    if (!stockTake) {
      await startStockTake();
    }
    setShowStockTake(true);
  };

  const handleStockTakeComplete = async () => {
    await completeStockTake();
    setShowStockTake(false);
  };

  const handleReceiveInventorySuccess = async () => {
    setActiveTab("stock");
  };

  // Show stock take view when active
  if (showStockTake) {
    return (
      <StockTakeView
        stock={stock}
        stockTake={stockTake}
        onBack={() => setShowStockTake(false)}
        onSaveItems={saveItems}
        onComplete={handleStockTakeComplete}
        // onRefresh={refresh}
      />
    );
  }

  if (productsLoading) <LoadingSpinner />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Monitor stock levels and receive new inventory
            </p>
          </div>

          {/* Stock Take Button - Only show on stock tab */}
          {/* {activeTab === "stock" && (
            <button
              onClick={handleStockTake}
              className="
                flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                bg-linear-to-r from-purple-600 to-pink-600
                hover:from-purple-700 hover:to-pink-700
                text-white font-semibold
                shadow-lg shadow-purple-500/30
                hover:shadow-purple-500/50
                transition-all duration-200
                border border-purple-500/30
                group
                w-full sm:w-auto
              "
            >
              <ClipboardList className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              <span>Stock Take</span>
            </button>
          )} */}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-purple-500/20">
          <button
            onClick={() => setActiveTab("stock")}
            className={`
              flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold transition-all relative
              ${
                activeTab === "stock"
                  ? "text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
          >
            <Package className="w-5 h-5" />
            <span className="hidden sm:inline">Stock Levels</span>
            <span className="sm:hidden">Stock</span>
            {activeTab === "stock" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-pink-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("receive")}
            className={`
              flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold transition-all relative
              ${
                activeTab === "receive"
                  ? "text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
          >
            <TruckIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Receive Inventory</span>
            <span className="sm:hidden">Receive</span>
            {activeTab === "receive" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`
              flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold transition-all relative
              ${
                activeTab === "reports"
                  ? "text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
          >
            <ChartNoAxesCombined className="w-5 h-5" />
            <span className="hidden sm:inline">Stock Take Reports</span>
            <span className="sm:hidden">Reports</span>
            {activeTab === "reports" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-pink-500" />
            )}
          </button>

          {user?.role === "owner" && (
            <button
              onClick={() => setActiveTab("approvals")}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold transition-all relative
                ${
                  activeTab === "approvals"
                    ? "text-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }
              `}
            >
              <ClipboardCheck className="w-5 h-5" />
              <span className="hidden sm:inline">Approvals</span>
              <span className="sm:hidden">Approvals</span>
              {activeTab === "approvals" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-pink-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "stock" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Items */}
            <div
              className="
              relative overflow-hidden
              p-4 sm:p-5 rounded-xl
              bg-linear-to-br from-purple-900/30 to-purple-900/10
              backdrop-blur-md
              border border-purple-500/20
              shadow-lg shadow-purple-500/5
              hover:shadow-purple-500/10
              transition-all duration-300
              group
            "
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <svg
                      className="w-5 h-5 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">
                  Total Items
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stats.total}
                </p>
              </div>
            </div>

            {/* Low Stock */}
            <div
              className="
              relative overflow-hidden
              p-4 sm:p-5 rounded-xl
              bg-linear-to-br from-orange-900/30 to-orange-900/10
              backdrop-blur-md
              border border-orange-500/20
              shadow-lg shadow-orange-500/5
              hover:shadow-orange-500/10
              transition-all duration-300
              group
            "
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                    <svg
                      className="w-5 h-5 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">
                  Low Stock
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stats.lowStock}
                </p>
              </div>
            </div>

            {/* Out of Stock */}
            <div
              className="
              relative overflow-hidden
              p-4 sm:p-5 rounded-xl
              bg-linear-to-br from-red-900/30 to-red-900/10
              backdrop-blur-md
              border border-red-500/20
              shadow-lg shadow-red-500/5
              hover:shadow-red-500/10
              transition-all duration-300
              group
            "
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">
                  Out of Stock
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stats.outOfStock}
                </p>
              </div>
            </div>

            {/* Total Value */}
            <div
              className="
              relative overflow-hidden
              p-4 sm:p-5 rounded-xl
              bg-linear-to-br from-pink-900/30 to-pink-900/10
              backdrop-blur-md
              border border-pink-500/20
              shadow-lg shadow-pink-500/5
              hover:shadow-pink-500/10
              transition-all duration-300
              group
              col-span-2 lg:col-span-1
            "
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30">
                    <svg
                      className="w-5 h-5 text-pink-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">
                  Total Value
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  KSh {stats.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Alert Banner for Low/Out of Stock */}
          {(stats.lowStock > 0 || stats.outOfStock > 0) && (
            <div
              className="
              p-4 rounded-xl
              bg-linear-to-r from-orange-900/20 via-red-900/20 to-orange-900/20
              backdrop-blur-md
              border border-orange-500/30
              flex items-start gap-3
            "
            >
              <div className="shrink-0 mt-0.5">
                <svg
                  className="w-6 h-6 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-300 mb-1">
                  Inventory Alert
                </h3>
                <p className="text-sm text-gray-300">
                  {stats.outOfStock > 0 && (
                    <span className="font-medium text-red-400">
                      {stats.outOfStock}{" "}
                      {stats.outOfStock === 1 ? "item is" : "items are"} out of
                      stock.{" "}
                    </span>
                  )}
                  {stats.lowStock > 0 && (
                    <span className="font-medium text-orange-400">
                      {stats.lowStock}{" "}
                      {stats.lowStock === 1 ? "item has" : "items have"} low
                      stock levels.
                    </span>
                  )}{" "}
                  Consider restocking soon to avoid shortages.
                </p>
              </div>
            </div>
          )}

          {/* Stock Table */}
          <div className="bg-gray-900/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-purple-500/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Stock Overview
              </h2>
              <button
                // onClick={refresh}
                disabled={productsLoading}
                className="
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  bg-gray-900/40 backdrop-blur-md
                  border border-purple-500/20
                  text-gray-300 hover:text-white
                  hover:border-purple-500/40
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group
                  text-sm
                "
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-500 ${
                    productsLoading ? "animate-spin" : "group-hover:rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline font-medium">Refresh</span>
              </button>
            </div>
            <StockTable stock={stock} loading={productsLoading} />
          </div>
        </>
      ) : activeTab == "reports" ? (
        <StockTakeReports />
      ) : activeTab === "approvals" ? (
        <ApprovalTab />
      ) : (
        <ReceiveInventoryTab
          products={stock}
          suppliers={suppliers}
          onReceiveInventory={receiveInventory}
          onSuccess={handleReceiveInventorySuccess}
          onCancel={() => setActiveTab("stock")}
        />
      )}
    </div>
  );
};

export default InventoryManagement;

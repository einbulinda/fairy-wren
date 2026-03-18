import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import VarianceBadge from "./VarianceBadge";

export default function StockTakeView({
  stock,
  stockTake,
  onBack,
  onSaveItems,
  onComplete,
  onRefresh,
}) {
  const [counts, setCounts] = useState({});
  const [previousCounts, setPreviousCounts] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedCounts, setSavedCounts] = useState({});
  const itemsPerPage = 10;

  // Load saved counts from stockTake if available
  useEffect(() => {
    if (stockTake?.items) {
      const savedCounts = {};
      stockTake.items.forEach((item) => {
        savedCounts[item.productId] = item.physicalQty;
      });
      setCounts(savedCounts);
      setHasSaved(true);
    }
  }, [stockTake]);

  // Filter stock based on search and variance filter
  const filteredStock = useMemo(() => {
    let filtered = stock;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Variance filter
    if (showVarianceOnly) {
      filtered = filtered.filter((p) => {
        const systemQty = p.current_stock;
        const physicalQty =
          counts[p.id] === undefined ? systemQty : Number(counts[p.id]);
        return physicalQty !== systemQty;
      });
    }

    return filtered;
  }, [stock, searchTerm, showVarianceOnly, counts]);

  // Pagination
  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStock = filteredStock.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showVarianceOnly]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCounted = Object.keys(counts).length;
    const totalItems = stock.length;
    const progress = totalItems > 0 ? (totalCounted / totalItems) * 100 : 0;

    let totalVariance = 0;
    let itemsWithVariance = 0;

    stock.forEach((p) => {
      const systemQty = p.current_stock;
      const physicalQty =
        counts[p.id] === undefined ? systemQty : Number(counts[p.id]);
      const variance = physicalQty - systemQty;

      if (variance !== 0) {
        totalVariance += variance;
        itemsWithVariance++;
      }
    });

    return {
      totalCounted,
      totalItems,
      progress,
      totalVariance,
      itemsWithVariance,
    };
  }, [stock, counts]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!hasSaved) {
      return Object.keys(counts).length > 0;
    }

    const keys = new Set([...Object.keys(savedCounts), ...Object.keys(counts)]);

    for (const key of keys) {
      if (Number(savedCounts[key] ?? null) !== Number(counts[key] ?? null)) {
        return true;
      }
    }

    return false;
  }, [counts, savedCounts, hasSaved]);

  const handleSave = async () => {
    if (Object.keys(counts).length === 0) {
      toast.error("Please count at least one item before saving");
      return;
    }

    setSaving(true);
    try {
      // Prepare items in the format expected by the backend
      const items = stock.map((p) => ({
        productId: p.id,
        systemQty: p.current_stock,
        physicalQty: Number(counts[p.id] ?? p.current_stock),
      }));

      // Call the backend to save items
      await onSaveItems(items);

      // 🔴 THIS IS THE CRITICAL LINE MISSING TO ACTIVATE COMPLETE STOCK TAKE
      const snapshot = {};
      items.forEach((i) => {
        snapshot[i.productId] = i.physicalQty;
      });

      setSavedCounts(snapshot);

      setHasSaved(true);
      toast.success("Stock counts saved successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to save counts");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!hasSaved) {
      toast.error("Please save your counts before completing");
      return;
    }

    if (hasUnsavedChanges) {
      toast.error("You have unsaved changes. Please save before completing.");
      return;
    }

    if (stats.totalCounted < stats.totalItems) {
      const confirmed = window.confirm(
        `You've only counted ${stats.totalCounted} of ${stats.totalItems} items. Complete stock take anyway?`,
      );
      if (!confirmed) return;
    }

    setCompleting(true);
    try {
      await onComplete();
      toast.success("Stock take completed!");
    } catch (error) {
      toast.error(error.message || "Failed to complete stock take");
    } finally {
      setCompleting(false);
    }
  };

  const handleCountChange = (productId, value) => {
    setCounts({
      ...counts,
      [productId]: value,
    });
  };

  const handleAutoFill = () => {
    // Save current state for undo
    setPreviousCounts({ ...counts });

    // Auto-fill with system values
    const newCounts = {};
    stock.forEach((p) => {
      newCounts[p.id] = p.current_stock;
    });
    setCounts(newCounts);
    toast.success("All counts set to system values");
  };

  const handleUndo = () => {
    if (previousCounts !== null) {
      setCounts(previousCounts);
      setPreviousCounts(null);
      toast.success("Auto-fill undone");
    }
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all counts? This action cannot be undone.",
    );
    if (confirmed) {
      setPreviousCounts({ ...counts });
      setCounts({});
      toast.success("All counts cleared");
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast.success("Inventory refreshed");
    } catch (error) {
      console.log(error);
      toast.error("Failed to refresh inventory");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="
              p-2 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-gray-300 hover:text-white
              hover:border-purple-500/40
              transition-all duration-200
            "
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Stock Take
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-400 text-sm">Count physical inventory</p>
              {stockTake?.id && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                  ID: {stockTake.id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="
              p-2.5 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-gray-300 hover:text-white
              hover:border-purple-500/40
              transition-all duration-200
              group
            "
            title="Refresh inventory"
          >
            <svg
              className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500"
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
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-gray-300 hover:text-white
              hover:border-purple-500/40
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              font-medium
              relative
            "
          >
            {hasUnsavedChanges && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-gray-900 animate-pulse"></div>
              </div>
            )}
            {saving ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </>
            )}
          </button>

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            disabled={!hasSaved || hasUnsavedChanges || completing}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-lg
              bg-linear-to-r from-green-600 to-emerald-600
              hover:from-green-700 hover:to-emerald-700
              text-white font-semibold
              shadow-lg shadow-green-500/30
              hover:shadow-green-500/50
              transition-all duration-200
              border border-green-500/30
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:from-gray-600 disabled:to-gray-700
              disabled:shadow-none
            "
            title={
              !hasSaved
                ? "Save your counts first"
                : hasUnsavedChanges
                  ? "Save unsaved changes first"
                  : completing
                    ? "Completing stock take..."
                    : "Complete stock take"
            }
          >
            {completing ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="hidden sm:inline">Completing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Complete</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!hasSaved && (
        <div className="p-4 rounded-xl bg-linear-to-r from-orange-900/20 via-orange-900/20 to-orange-900/20 backdrop-blur-md border border-orange-500/30 flex items-start gap-3">
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
              Remember to Save
            </h3>
            <p className="text-sm text-gray-300">
              You must save your counts before you can complete the stock take.
              Save periodically to avoid losing progress.
            </p>
          </div>
        </div>
      )}

      {hasUnsavedChanges && hasSaved && (
        <div className="p-4 rounded-xl bg-linear-to-r from-blue-900/20 via-blue-900/20 to-blue-900/20 backdrop-blur-md border border-blue-500/30 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-300 mb-1">
              Unsaved Changes
            </h3>
            <p className="text-sm text-gray-300">
              You have unsaved changes. Please save before completing the stock
              take.
            </p>
          </div>
        </div>
      )}

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div
          className="
          relative overflow-hidden
          p-5 rounded-xl
          bg-linear-to-br from-purple-900/30 to-purple-900/10
          backdrop-blur-md
          border border-purple-500/20
          shadow-lg shadow-purple-500/5
        "
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-gray-400 text-sm mb-2">Progress</p>
            <div className="flex items-end gap-2 mb-3">
              <p className="text-3xl font-bold text-white">
                {stats.totalCounted}
              </p>
              <p className="text-gray-400 mb-1">/ {stats.totalItems}</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.progress.toFixed(0)}% complete
            </p>
          </div>
        </div>

        {/* Variance Card */}
        <div
          className="
          relative overflow-hidden
          p-5 rounded-xl
          bg-linear-to-br from-orange-900/30 to-orange-900/10
          backdrop-blur-md
          border border-orange-500/20
          shadow-lg shadow-orange-500/5
        "
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-gray-400 text-sm mb-2">Items with Variance</p>
            <p className="text-3xl font-bold text-white">
              {stats.itemsWithVariance}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Total variance:{" "}
              <span
                className={`font-semibold ${
                  stats.totalVariance > 0
                    ? "text-green-400"
                    : stats.totalVariance < 0
                      ? "text-red-400"
                      : "text-gray-400"
                }`}
              >
                {stats.totalVariance > 0 && "+"}
                {stats.totalVariance}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div
          className="
          relative overflow-hidden
          p-5 rounded-xl
          bg-linear-to-br from-pink-900/30 to-pink-900/10
          backdrop-blur-md
          border border-pink-500/20
          shadow-lg shadow-pink-500/5
        "
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl" />
          <div className="relative space-y-2">
            <p className="text-gray-400 text-sm mb-3">Quick Actions</p>
            <button
              onClick={handleAutoFill}
              className="
                w-full px-3 py-2 rounded-lg
                bg-pink-500/20 hover:bg-pink-500/30
                border border-pink-500/30 hover:border-pink-500/50
                text-pink-300 hover:text-pink-200
                text-sm font-medium
                transition-all duration-200
                flex items-center justify-center gap-2
              "
            >
              <svg
                className="w-4 h-4"
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
              Auto-fill System Values
            </button>
            {previousCounts !== null && (
              <button
                onClick={handleUndo}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-blue-500/20 hover:bg-blue-500/30
                  border border-blue-500/30 hover:border-blue-500/50
                  text-blue-300 hover:text-blue-200
                  text-sm font-medium
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Undo Auto-fill
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="
                w-full px-3 py-2 rounded-lg
                bg-red-500/20 hover:bg-red-500/30
                border border-red-500/30 hover:border-red-500/50
                text-red-300 hover:text-red-200
                text-sm font-medium
                transition-all duration-200
                flex items-center justify-center gap-2
              "
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear All Counts
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2.5 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-white placeholder-gray-400
              focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg
                className="w-5 h-5"
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
            </button>
          )}
        </div>

        {/* Variance Filter */}
        <button
          onClick={() => setShowVarianceOnly(!showVarianceOnly)}
          className={`
            px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
            ${
              showVarianceOnly
                ? "bg-linear-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/30 border border-orange-500/50"
                : "bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-gray-300 hover:border-orange-500/40"
            }
          `}
        >
          {showVarianceOnly ? "Show All" : "Variance Only"}
        </button>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 px-1">
        <span>
          Showing {currentStock.length > 0 ? startIndex + 1 : 0} -{" "}
          {Math.min(endIndex, filteredStock.length)} of {filteredStock.length}{" "}
          {filteredStock.length === 1 ? "item" : "items"}
        </span>
        {(searchTerm || showVarianceOnly) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setShowVarianceOnly(false);
            }}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stock Count Table */}
      <div className="bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10 overflow-hidden">
        {/* Table Header */}
        <div className="bg-linear-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm px-4 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-purple-200">
          <div className="col-span-12 sm:col-span-4">Product</div>
          <div className="hidden sm:block sm:col-span-2 text-right">System</div>
          <div className="hidden sm:block sm:col-span-3 text-center">
            Physical Count
          </div>
          <div className="hidden sm:block sm:col-span-3 text-right">
            Variance
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-purple-500/10">
          {currentStock.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            currentStock.map((product, index) => {
              const systemQty = product.current_stock;
              const physicalQty =
                counts[product.id] === undefined
                  ? systemQty
                  : Number(counts[product.id]);
              const variance = physicalQty - systemQty;
              const isEvenRow = index % 2 === 0;

              return (
                <div
                  key={product.id}
                  className={`
                    px-4 py-4 grid grid-cols-12 gap-4 
                    transition-colors duration-200
                    ${isEvenRow ? "bg-gray-900/20" : "bg-gray-900/5"}
                    hover:bg-purple-500/10
                  `}
                >
                  {/* Product Info - Full width on mobile */}
                  <div className="col-span-12 sm:col-span-4">
                    <div className="flex items-start gap-3">
                      {/* Item Number Badge */}
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-300">
                          {startIndex + index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Unit: {product.unit}
                        </p>
                        {/* Mobile: Show system qty inline */}
                        <p className="text-sm text-gray-400 mt-1 sm:hidden">
                          System:{" "}
                          <span className="font-mono text-purple-300 font-semibold">
                            {systemQty}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* System Qty - Hidden on mobile */}
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                    <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 font-mono text-purple-300 font-semibold text-sm">
                      {systemQty}
                    </span>
                  </div>

                  {/* Physical Count Input */}
                  <div className="col-span-8 sm:col-span-3 flex items-center">
                    <div className="relative w-full">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="
                          w-full px-4 py-2.5 rounded-lg
                          bg-gray-800/50 backdrop-blur-sm
                          border-2 border-purple-500/30
                          text-white font-mono text-center
                          focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30
                          transition-all duration-200
                          text-lg font-semibold
                        "
                        value={physicalQty}
                        onChange={(e) =>
                          handleCountChange(product.id, e.target.value)
                        }
                        placeholder="0"
                      />
                      {/* Visual indicator for counted items */}
                      {counts[product.id] !== undefined && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variance */}
                  <div className="col-span-4 sm:col-span-3 flex items-center justify-end">
                    <VarianceBadge value={variance} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${
                  currentPage === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  currentPage === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`
                      w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200
                      ${
                        currentPage === pageNum
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 border border-purple-500/50"
                          : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className={`
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  currentPage === totalPages
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              Next
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${
                  currentPage === totalPages
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper */}
      <div className="p-4 rounded-xl bg-linear-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-md border border-purple-500/10">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-purple-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-300 mb-2">
              Pro Tips for Accurate Counting
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Use Tab key to move between items quickly</li>
              <li>• Green dot indicates you've updated the count</li>
              <li>• Save periodically to avoid losing progress</li>
              <li>• Filter by variance to review discrepancies</li>
              <li>
                • Complete button is only enabled after saving your counts
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

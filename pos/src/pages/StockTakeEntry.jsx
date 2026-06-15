import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Check,
  X,
  AlertTriangle,
  Save,
  FileText,
  MapPin,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { useProducts } from "../hooks/useProducts";
import { useStockTake } from "../hooks/inventory/useStockTake";
import { toast } from "react-hot-toast";

export default function StockTakeEntry() {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const {
    createStockTakeSession,
    recordStockTakeItem,
    completeStockTake,
    getIncompleteStockTakes,
    getStockTakeItems,
  } = useStockTake();

  // Session setup
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState("full");
  const [location, setLocation] = useState("Bar");
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [incompleteSessions, setIncompleteSessions] = useState([]);

  // Stock take data - keyed by product ID
  const [searchQuery, setSearchQuery] = useState("");
  const [physicalQuantities, setPhysicalQuantities] = useState({});
  const [reasons, setReasons] = useState({});
  const [notesList, setNotesList] = useState({});

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Recorded items
  const [recordedItems, setRecordedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [resumeSearch, setResumeSearch] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Reason codes
  const reasonCodes = [
    { value: "", label: "Select a reason (optional)" },
    { value: "receiving_error", label: "Receiving Error" },
    { value: "count_mistake", label: "Count Mistake" },
    { value: "damaged_broken", label: "Damaged/Broken" },
    { value: "theft_shortage", label: "Theft/Shortage" },
    { value: "spillage_waste", label: "Spillage/Waste" },
    { value: "expired_product", label: "Expired Product" },
    { value: "system_error", label: "System Error" },
    { value: "transfer", label: "Transfer" },
    { value: "other", label: "Other" },
  ];

  // Stock take types
  const stockTakeTypes = [
    { value: "full", label: "Full Inventory Count" },
    { value: "partial", label: "Partial Count" },
    { value: "spot_check", label: "Spot Check" },
    { value: "cycle_count", label: "Cycle Count" },
  ];

  // Locations
  const locations = ["Bar", "Kitchen"];

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Load incomplete sessions on mount
  useEffect(() => {
    fetchIncompleteSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch incomplete stock take sessions
  const fetchIncompleteSessions = async () => {
    if (!user?.id) return;

    setLoadingSessions(true);
    try {
      const data = await getIncompleteStockTakes();
      setIncompleteSessions(data || []);
    } catch (error) {
      console.error("Error fetching incomplete sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Resume an incomplete session
  const handleResumeSession = async (session) => {
    try {
      setLoading(true);

      // Load session details
      const items = await getStockTakeItems(session.id);

      // Set session state
      setCurrentSessionId(session.id);
      setSessionName(
        session.stock_take_name ||
          `Stock Take - ${new Date(session.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}`,
      );
      setSessionType(session.stock_take_type || "full");
      setLocation(session.location || "Bar");

      // Load already recorded items
      const recorded = items?.map((item) => ({
        ...item,
        product: {
          id: item.product_id,
          name: item.product_name,
          current_stock: item.system_qty,
        },
        adjustment: item.adjustment,
        physical_qty: item.physical_qty,
        requires_approval: Math.abs(item.adjustment) > 10,
      }));

      setRecordedItems(recorded);
      setSessionStarted(true);
      setShowResumeModal(false);

      toast.success(`Resumed session: ${session.stock_take_name}`);
    } catch (error) {
      console.error("Error resuming session:", error);
      toast.error("Failed to resume session");
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search and exclude already recorded items
  const recordedProductIds = recordedItems.map((item) => item.product?.id);
  const filteredProducts = (products || [])
    .filter((product) => !recordedProductIds.includes(product.id))
    .filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "name") {
      aValue = a.name.toLowerCase();
      bValue = b.name.toLowerCase();
    } else if (sortField === "current_stock") {
      aValue = a.current_stock || 0;
      bValue = b.current_stock || 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate products
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <ChevronUp className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-50" />
      );
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 text-pink-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-pink-400" />
    );
  };

  // Start stock take session
  const handleStartSession = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    setLoading(true);
    try {
      const response = await createStockTakeSession({
        stockTakeName: sessionName,
        stockTakeType: sessionType,
        location: location,
      });

      setCurrentSessionId(response.stockTakeId);
      setSessionStarted(true);
      toast.success("Stock take session started");
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  // Record stock take item
  const handleRecordItem = async (product) => {
    const physicalQty = physicalQuantities[product.id];

    if (!physicalQty && physicalQty !== 0) {
      toast.error("Please enter physical quantity for " + product.name);
      return;
    }

    // Check if adjustment is large
    const adjustment = parseInt(physicalQty) - (product.current_stock || 0);
    const requiresReason = Math.abs(adjustment) > 10;
    const reason = reasons[product.id];

    if (requiresReason && !reason) {
      toast.error("Please select a reason for large adjustments (>10 units)");
      return;
    }

    setLoading(true);

    try {
      const response = await recordStockTakeItem(currentSessionId, {
        productId: product.id,
        physicalQty: parseInt(physicalQty),
        reason: reason || null,
        notes: notesList[product.id] || null,
        batchNumber: null,
      });

      // Add to recorded items
      setRecordedItems([
        ...recordedItems,
        {
          ...response,
          product: product,
          recordedAt: new Date(),
        },
      ]);

      // Show appropriate message based on approval requirement
      if (response.requires_approval) {
        toast.success("Item recorded (requires manager approval)", {
          icon: "⚠️",
          duration: 4000,
        });
      } else {
        toast.success("Item recorded");
      }

      // Clear this product's entries
      setPhysicalQuantities((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
      setReasons((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
      setNotesList((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
    } catch (error) {
      console.error("Error recording item:", error);
      toast.error("Failed to record item");
    } finally {
      setLoading(false);
    }
  };

  // Complete stock take
  const handleCompleteStockTake = async () => {
    if (recordedItems.length === 0) {
      toast.error("Please record at least one item before completing");
      return;
    }

    const confirmComplete = window.confirm(
      `Complete stock take with ${recordedItems.length} items?\n\nThis will update inventory levels.`,
    );

    if (!confirmComplete) return;

    setCompleting(true);
    try {
      const response = await completeStockTake(currentSessionId);

      // Show result message
      if (response.requires_approval) {
        toast.success(
          `Stock take completed!\n${response.flagged_items} items flagged for manager review.`,
          { duration: 5000 },
        );
      } else {
        toast.success(
          `Stock take completed and approved!\nInventory updated for ${response.item_count} items.`,
          { duration: 5000 },
        );
      }

      // Reset session
      setSessionStarted(false);
      setCurrentSessionId(null);
      setRecordedItems([]);
      setSessionName("");
      setPhysicalQuantities({});
      setReasons({});
      setNotesList({});
    } catch (error) {
      console.error("Error completing stock take:", error);
      toast.error("Failed to complete stock take");
    } finally {
      setCompleting(false);
    }
  };

  // Cancel session
  const handleCancelSession = () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this stock take?\n\nAll recorded items will be lost.",
    );

    if (confirmCancel) {
      setSessionStarted(false);
      setCurrentSessionId(null);
      setRecordedItems([]);
      setSessionName("");
      setPhysicalQuantities({});
      setReasons({});
      setNotesList({});
      toast.success("Session cancelled");
    }
  };

  // Get adjustment for a product
  const getAdjustment = (product) => {
    const physicalQty = physicalQuantities[product.id];
    if (!physicalQty && physicalQty !== 0) return null;
    return parseInt(physicalQty) - (product.current_stock || 0);
  };

  // Get alert color for adjustment
  const getAdjustmentColor = (adjustment) => {
    if (adjustment === null) return "text-gray-400";
    if (adjustment === 0) return "text-gray-400";
    if (Math.abs(adjustment) > 10) return "text-red-400";
    return adjustment > 0 ? "text-green-400" : "text-yellow-400";
  };

  if (productsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 pb-20">
      {!sessionStarted ? (
        /* Session Setup Screen */
        <div className="backdrop-blur-xl bg-linear-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Start Stock Take
              </h2>
              <p className="text-sm text-gray-400">
                Begin a new stock counting session
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Session Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Session Name *
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Weekly Count - January 2026"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              />
            </div>

            {/* Stock Take Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Stock Take Type
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full bg-gray-700 border border-purple-500 rounded-lg px-4 py-3 text-white focus:outline-none  focus:border-pink-500"
              >
                {stockTakeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-700 border border-purple-500 rounded-lg px-4 py-3 text-white focus:outline-none  focus:border-pink-500"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* User Info */}
            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Performed by:</span>
              <span className="text-white font-medium">
                {user?.name || "Unknown User"}
              </span>
              {user?.role && (
                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded text-xs">
                  {user.role.toUpperCase()}
                </span>
              )}
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading || !sessionName.trim()}
              className="w-full py-3 bg-linear-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Start Stock Take
                </>
              )}
            </button>

            {/* Resume Session Button */}
            <button
              onClick={() => {
                fetchIncompleteSessions();
                setResumeSearch("");
                setShowResumeModal(true);
              }}
              className="w-full py-3 bg-white/5 border border-yellow-500/30 text-white rounded-lg font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5 text-yellow-400" />
              Resume Pending Session
              {incompleteSessions.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-bold">
                  {incompleteSessions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Stock Take Entry Screen */
        <>
          {/* Session Header */}
          <div className="backdrop-blur-xl bg-linear-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {sessionName}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {sessionType.replace("_", " ")}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCancelSession}
                className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4" />
                {user?.name}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Package className="w-4 h-4" />
                {recordedItems.length} items recorded
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="backdrop-blur-xl bg-linear-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  Count Products
                </h3>
                {recordedItems.length > 0 && (
                  <button
                    onClick={handleCompleteStockTake}
                    disabled={completing}
                    className="px-4 py-2 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    {completing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Complete ({recordedItems.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-1">
                        Product
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("current_stock")}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        System Stock
                        <SortIcon field="current_stock" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Physical Count
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Adjustment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        {searchQuery
                          ? "No products found"
                          : "All products recorded"}
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => {
                      const adjustment = getAdjustment(product);
                      const requiresReason =
                        adjustment !== null && Math.abs(adjustment) > 10;

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          {/* Product Name */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">
                              {product.name}
                            </div>
                            {product.category && (
                              <div className="text-xs text-gray-400">
                                {product.category}
                              </div>
                            )}
                          </td>

                          {/* System Stock */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-gray-300">
                              {product.current_stock || 0}
                            </span>
                          </td>

                          {/* Physical Count Input */}
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              value={physicalQuantities[product.id] ?? ""}
                              onChange={(e) =>
                                setPhysicalQuantities({
                                  ...physicalQuantities,
                                  [product.id]: e.target.value,
                                })
                              }
                              placeholder="Count"
                              className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-center focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                            />
                          </td>

                          {/* Adjustment */}
                          <td className="px-4 py-3 text-center">
                            {adjustment !== null && (
                              <div className="flex items-center justify-center gap-1">
                                <span
                                  className={`font-bold ${getAdjustmentColor(adjustment)}`}
                                >
                                  {adjustment > 0 && "+"}
                                  {adjustment}
                                </span>
                                {Math.abs(adjustment) > 10 && (
                                  <AlertTriangle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                            )}
                          </td>

                          {/* Reason */}
                          <td className="px-4 py-3">
                            {(requiresReason || adjustment !== null) &&
                              adjustment !== 0 && (
                                <select
                                  value={reasons[product.id] || ""}
                                  onChange={(e) =>
                                    setReasons({
                                      ...reasons,
                                      [product.id]: e.target.value,
                                    })
                                  }
                                  className={`w-full bg-gray-700 border ${requiresReason ? "border-red-500/50" : "border-white/10"} rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50`}
                                >
                                  {reasonCodes.map((rc) => (
                                    <option key={rc.value} value={rc.value}>
                                      {rc.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                          </td>

                          {/* Notes */}
                          <td className="px-4 py-3">
                            <textarea
                              value={notesList[product.id] || ""}
                              onChange={(e) =>
                                setNotesList({
                                  ...notesList,
                                  [product.id]: e.target.value,
                                })
                              }
                              placeholder="Optional notes"
                              rows={1}
                              className="w-full min-w-[150px] bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-y"
                            />
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRecordItem(product)}
                              disabled={
                                loading || !physicalQuantities[product.id]
                              }
                              className="px-3 py-1 bg-linear-to-r from-pink-500 to-purple-600 text-white rounded text-sm font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"
                            >
                              <Save className="w-3 h-3" />
                              Record
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, sortedProducts.length)} of{" "}
                  {sortedProducts.length} products
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-white/10 text-white transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded border transition-colors ${
                                currentPage === page
                                  ? "bg-linear-to-r from-pink-500 to-purple-600 border-pink-500 text-white"
                                  : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={page} className="text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      },
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-white/10 text-white transition-colors flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recorded Items Summary */}
          {recordedItems.length > 0 && (
            <div className="backdrop-blur-xl bg-linear-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Recorded Items ({recordedItems.length})
                </h3>
              </div>

              <div className="divide-y divide-white/10 max-h-80 overflow-y-auto">
                {recordedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          {item.product_name}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span>System: {item.system_qty}</span>
                          <span>Physical: {item.physical_qty}</span>
                          {item.requires_approval && (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Needs Approval
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${getAdjustmentColor(item.adjustment)}`}
                      >
                        {item.adjustment > 0 && "+"}
                        {item.adjustment}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resume Session Modal */}
      {showResumeModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowResumeModal(false)}
        >
          <div
            className="backdrop-blur-xl bg-linear-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-linear-to-br from-pink-500/10 to-purple-600/10 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Resume Stock Take Session
              </h3>
              <button
                onClick={() => setShowResumeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <p className="text-gray-400 text-sm mb-4">
                Select a session to continue from where you left off
              </p>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={resumeSearch}
                  onChange={(e) => setResumeSearch(e.target.value)}
                  placeholder="Search by session name or location..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm"
                />
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400 text-sm">
                    Loading sessions...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {incompleteSessions
                    .filter((session) => {
                      if (!resumeSearch.trim()) return true;
                      const query = resumeSearch.toLowerCase();
                      return (
                        session.stock_take_name
                          ?.toLowerCase()
                          .includes(query) ||
                        session.location?.toLowerCase().includes(query) ||
                        session.performed_by?.toLowerCase().includes(query)
                      );
                    })
                    .map((session) => (
                      <div
                        key={session.id}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => handleResumeSession(session)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-2">
                              {session.stock_take_name ||
                                `Stock Take - ${new Date(session.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}`}
                            </h4>

                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div className="flex items-center gap-1 text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {session.stock_take_type?.replace("_", " ")}
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {session.location || "Unknown"}
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <User className="w-3 h-3" />
                                {session.performed_by || "Unknown"}
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Clock className="w-3 h-3" />
                                {new Date(session.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs border border-yellow-500/30">
                                In Progress
                              </span>
                              {session.item_count > 0 && (
                                <span className="text-xs text-gray-400">
                                  {session.item_count} items recorded
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResumeSession(session);
                            }}
                            className="px-4 py-2 bg-linear-to-r from-pink-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-pink-600 hover:to-purple-700 transition-all flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Resume
                          </button>
                        </div>
                      </div>
                    ))}

                  {incompleteSessions.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        No pending sessions found
                      </p>
                    </div>
                  )}

                  {incompleteSessions.length > 0 &&
                    resumeSearch.trim() &&
                    incompleteSessions.filter((s) => {
                      const q = resumeSearch.toLowerCase();
                      return (
                        s.stock_take_name?.toLowerCase().includes(q) ||
                        s.location?.toLowerCase().includes(q) ||
                        s.performed_by?.toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">
                          No sessions matching &quot;{resumeSearch}&quot;
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

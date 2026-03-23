import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { useStockTake } from "@/hooks/inventory/useStockTake";
import {
  Search,
  Save,
  RotateCcw,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  FolderOpen,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/shared/ConfirmModal";

// Stock take types (same as classic)
const STOCK_TAKE_TYPES = [
  { value: "full", label: "Full Inventory Count" },
  { value: "partial", label: "Partial Count" },
  { value: "spot_check", label: "Spot Check" },
  { value: "cycle_count", label: "Cycle Count" },
];

// Locations (same as classic)
const LOCATIONS = ["Bar", "Kitchen"];

// Reason codes for large adjustments
const REASON_CODES = [
  { value: "", label: "Select reason (optional)" },
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

const BetaStockTakeScreen = () => {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts({});
  const {
    createStockTakeSession,
    recordStockTakeItem,
    completeStockTake,
    getIncompleteStockTakes,
    getStockTakeItems,
  } = useStockTake();

  // View state: 'list' | 'create' | 'count'
  const [view, setView] = useState("list");

  // Session setup
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState("full");
  const [location, setLocation] = useState("Bar");

  // Stock take data
  const [searchQuery, setSearchQuery] = useState("");
  const [physicalQuantities, setPhysicalQuantities] = useState({});
  const [reasons, setReasons] = useState({});
  const [notesList, setNotesList] = useState({});

  // Sessions list
  const [incompleteSessions, setIncompleteSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [resumeSearch, setResumeSearch] = useState("");

  // Recorded items
  const [recordedItems, setRecordedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Confirmation modals
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Load incomplete sessions on mount
  useEffect(() => {
    fetchIncompleteSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIncompleteSessions = async () => {
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

  // Start new stock take session
  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    setLoading(true);
    try {
      const response = await createStockTakeSession({
        stockTakeName: sessionName.trim(),
        stockTakeType: sessionType,
        location: location,
      });

      setCurrentSessionId(response.stockTakeId);
      setView("count");
      toast.success("Stock take session started");
    } catch (error) {
      toast.error("Failed to start session");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Resume existing session
  const handleResumeSession = async (session) => {
    setLoading(true);
    try {
      const items = await getStockTakeItems(session.id);

      setCurrentSessionId(session.id);
      setSessionName(
        session.stock_take_name ||
          `Stock Take - ${new Date(session.created_at).toLocaleDateString()}`
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

      setRecordedItems(recorded || []);
      setView("count");
      toast.success(`Resumed: ${session.stock_take_name}`);
    } catch (error) {
      console.error("Error resuming session:", error);
      toast.error("Failed to resume session");
    } finally {
      setLoading(false);
    }
  };

  // Filter products - exclude already recorded
  const recordedProductIds = recordedItems.map((item) => item.product?.id);
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((product) => !recordedProductIds.includes(product.id))
      .filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [products, recordedProductIds, searchQuery]);

  // Record a single item
  const handleRecordItem = async (product) => {
    const physicalQty = physicalQuantities[product.id];

    if (!physicalQty && physicalQty !== 0) {
      toast.error(`Please enter physical quantity for ${product.name}`);
      return;
    }

    const adjustment = parseInt(physicalQty) - (product.current_stock || 0);
    const requiresReason = Math.abs(adjustment) > 10;
    const reason = reasons[product.id];

    if (requiresReason && !reason) {
      toast.error("Select a reason for large adjustments (>10 units)");
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

      setRecordedItems([
        ...recordedItems,
        {
          ...response,
          product: product,
          recordedAt: new Date(),
        },
      ]);

      if (response.requires_approval) {
        toast.success("Item recorded (requires approval)", {
          icon: "⚠️",
          duration: 4000,
        });
      } else {
        toast.success("Item recorded");
      }

      // Clear entries for this product
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

    setCompleting(true);
    try {
      const response = await completeStockTake(currentSessionId);

      if (response.requires_approval) {
        toast.success(
          `Completed! ${response.flagged_items} items need manager review.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Completed and approved! ${response.item_count} items updated.`,
          { duration: 5000 }
        );
      }

      // Reset and go back to list
      resetSession();
    } catch (error) {
      console.error("Error completing stock take:", error);
      toast.error("Failed to complete stock take");
    } finally {
      setCompleting(false);
      setShowCompleteConfirm(false);
    }
  };

  // Cancel session
  const handleCancelSession = () => {
    resetSession();
    toast.success("Session cancelled");
    setShowCancelConfirm(false);
  };

  // Reset session state
  const resetSession = () => {
    setCurrentSessionId(null);
    setSessionName("");
    setSessionType("full");
    setLocation("Bar");
    setRecordedItems([]);
    setPhysicalQuantities({});
    setReasons({});
    setNotesList({});
    setView("list");
    fetchIncompleteSessions();
  };

  // Get adjustment for display
  const getAdjustment = (product) => {
    const physicalQty = physicalQuantities[product.id];
    if (!physicalQty && physicalQty !== 0) return null;
    return parseInt(physicalQty) - (product.current_stock || 0);
  };

  // Get color for adjustment
  const getAdjustmentColor = (adjustment) => {
    if (adjustment === null || adjustment === undefined) return "text-gray-400";
    if (adjustment === 0) return "text-gray-400";
    if (Math.abs(adjustment) > 10) return "text-red-400";
    return adjustment > 0 ? "text-emerald-400" : "text-amber-400";
  };

  if (productsLoading) return <LoadingSpinner />;

  // Render Session List View
  if (view === "list") {
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 bg-slate-900/30">
          <h1 className="text-xl font-bold text-white mb-1">Stock Take Sessions</h1>
          <p className="text-sm text-gray-400">
            {incompleteSessions.length} incomplete session
            {incompleteSessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search & New Button */}
        <div className="p-4 border-b border-slate-700/20">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search sessions..."
                value={resumeSearch}
                onChange={(e) => setResumeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <button
              onClick={() => setView("create")}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl font-semibold transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              New
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingSessions ? (
            <LoadingSpinner />
          ) : incompleteSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderOpen size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">No incomplete sessions</p>
              <p className="text-sm text-gray-500">
                Start a new stock take to count inventory
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incompleteSessions
                .filter((session) => {
                  if (!resumeSearch.trim()) return true;
                  const query = resumeSearch.toLowerCase();
                  return (
                    session.stock_take_name?.toLowerCase().includes(query) ||
                    session.location?.toLowerCase().includes(query) ||
                    session.performed_by?.toLowerCase().includes(query)
                  );
                })
                .map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleResumeSession(session)}
                    className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 hover:border-pink-500/30 rounded-xl transition-all text-left group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-pink-400 transition-colors">
                          {session.stock_take_name ||
                            `Stock Take - ${new Date(session.created_at).toLocaleDateString()}`}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {session.stock_take_type?.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {session.location || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {session.performed_by?.split(" ")[0] || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-gray-500 group-hover:text-pink-400 transition-colors"
                      />
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Create Session View
  if (view === "create") {
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 bg-slate-900/30">
          <button
            onClick={() => setView("list")}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Back to sessions
          </button>
          <h1 className="text-xl font-bold text-white">New Stock Take</h1>
        </div>

        {/* Form */}
        <div className="flex-1 p-4 flex flex-col space-y-4">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Session Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Weekly Count - January 2026"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sessionName.trim()) {
                  handleStartSession();
                }
              }}
              autoFocus
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 text-lg"
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
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-pink-500/50"
            >
              {STOCK_TAKE_TYPES.map((type) => (
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
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-pink-500/50"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* User Info */}
          <div className="bg-slate-800/30 rounded-lg p-3 flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Performed by:</span>
            <span className="text-white font-medium">
              {user?.full_name || "Unknown User"}
            </span>
          </div>

          <div className="mt-auto flex gap-3">
            <button
              onClick={() => setView("list")}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSession}
              disabled={!sessionName.trim() || loading}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Start Stock Take
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Counting View
  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30 bg-slate-900/30">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-white truncate">
              {sessionName}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {sessionType.replace("_", " ")}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            {recordedItems.length} item{recordedItems.length !== 1 ? "s" : ""}{" "}
            recorded
          </span>
          {recordedItems.length > 0 && (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              disabled={completing}
              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
            >
              {completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Complete ({recordedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700/20">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search products to count..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
          />
        </div>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 mb-2">
              {searchQuery ? "No products found" : "All products recorded"}
            </p>
            {recordedItems.length > 0 && !searchQuery && (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Complete Stock Take ({recordedItems.length})
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const adjustment = getAdjustment(product);
              const requiresReason = adjustment !== null && Math.abs(adjustment) > 10;
              const hasValue = physicalQuantities[product.id] !== undefined && physicalQuantities[product.id] !== "";

              return (
                <div
                  key={product.id}
                  className="p-4 bg-slate-800/50 border border-slate-700/30 rounded-xl"
                >
                  {/* Product Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-sm text-gray-500">
                        System Stock: {product.current_stock || 0}
                      </p>
                    </div>
                    {adjustment !== null && (
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${getAdjustmentColor(adjustment)}`}
                        >
                          {adjustment > 0 && "+"}
                          {adjustment}
                        </span>
                        {Math.abs(adjustment) > 10 && (
                          <AlertCircle className="w-4 h-4 text-red-400 inline ml-1" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inputs Row */}
                  <div className="flex gap-2 items-end">
                    {/* Physical Count */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">
                        Physical Count
                      </label>
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
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-center focus:outline-none focus:border-pink-500/50"
                      />
                    </div>

                    {/* Reason (if needed) */}
                    {(requiresReason || (hasValue && adjustment !== 0)) && (
                      <div className="flex-[2]">
                        <label className="block text-xs text-gray-400 mb-1">
                          Reason {requiresReason && <span className="text-red-400">*</span>}
                        </label>
                        <select
                          value={reasons[product.id] || ""}
                          onChange={(e) =>
                            setReasons({
                              ...reasons,
                              [product.id]: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 bg-slate-700/50 border rounded-lg text-white text-sm focus:outline-none focus:border-pink-500/50 ${
                            requiresReason && !reasons[product.id]
                              ? "border-red-500/50"
                              : "border-slate-600/50"
                          }`}
                        >
                          {REASON_CODES.map((rc) => (
                            <option key={rc.value} value={rc.value}>
                              {rc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Record Button */}
                    <button
                      onClick={() => handleRecordItem(product)}
                      disabled={loading || !hasValue}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-lg font-medium transition-all flex items-center gap-1"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Record
                    </button>
                  </div>

                  {/* Notes */}
                  {hasValue && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={notesList[product.id] || ""}
                        onChange={(e) =>
                          setNotesList({
                            ...notesList,
                            [product.id]: e.target.value,
                          })
                        }
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recorded Items Summary (if items recorded) */}
      {recordedItems.length > 0 && (
        <div className="p-4 border-t border-slate-700/30 bg-slate-900/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Recorded ({recordedItems.length})
          </h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {recordedItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 px-2 bg-slate-800/30 rounded text-sm"
              >
                <span className="text-gray-300 truncate flex-1">
                  {item.product_name}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    Sys: {item.system_qty} → Phy: {item.physical_qty}
                  </span>
                  <span
                    className={`font-medium ${getAdjustmentColor(item.adjustment)}`}
                  >
                    {item.adjustment > 0 && "+"}
                    {item.adjustment}
                  </span>
                  {item.requires_approval && (
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <ConfirmModal
          title="Cancel Session?"
          message="All recorded items will be lost. Are you sure?"
          confirmLabel="Cancel Session"
          cancelLabel="Continue"
          variant="danger"
          onConfirm={handleCancelSession}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {/* Complete Confirmation */}
      {showCompleteConfirm && (
        <ConfirmModal
          title="Complete Stock Take?"
          message={`This will finalize the stock take and update inventory for ${recordedItems.length} items.`}
          confirmLabel="Complete"
          cancelLabel="Continue Counting"
          variant="primary"
          onConfirm={handleCompleteStockTake}
          onCancel={() => setShowCompleteConfirm(false)}
        />
      )}
    </div>
  );
};

export default BetaStockTakeScreen;

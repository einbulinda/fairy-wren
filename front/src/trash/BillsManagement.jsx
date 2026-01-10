// BillsManagement.jsx
import {
  Search,
  Receipt,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardCheck,
  FileText,
  AlertCircle,
  Copy,
  Lock,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useBills } from "../hooks/useBills";
import { useAuth } from "../hooks/useAuth";
import { usePayments } from "../hooks/usePayments";
import { calculateBillTotals } from "../utils/calculations";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 10;

const BillsManagement = () => {
  const { user } = useAuth();
  const { allBills, isLoading } = useBills();
  const {
    bills: paymentBills,
    confirmBill,
    error: paymentError,
    isLoading: paymentLoading,
    reloadBills,
  } = usePayments();

  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'confirm'
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Check if user is bartender
  const isBartender = user?.role === "bartender";

  // Filter bills awaiting confirmation
  const awaitingConfirmation = useMemo(() => {
    return paymentBills.filter(
      (bill) => bill.status === "awaiting_confirmation"
    );
  }, [paymentBills]);

  // Filter and search bills
  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return allBills;

    return allBills.filter((bill) =>
      bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allBills]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBills.slice(startIndex, endIndex);
  }, [filteredBills, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleTabChange = (tab) => {
    // Don't allow non-bartenders to access confirm tab
    if (tab === "confirm" && !isBartender) {
      toast.error("Only bartenders can access payment confirmations");
      return;
    }
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleConfirmPayment = async (billId) => {
    if (!isBartender) {
      toast.error("Only bartenders can confirm payments");
      return;
    }

    const confirmed = window.confirm("Confirm that payment has been received?");
    if (!confirmed) return;

    try {
      const confirmingUser = { confirmedBy: user.id };
      await confirmBill(billId, confirmingUser);
      toast.success("Payment confirmed!");
      await reloadBills();
    } catch (error) {
      toast.error(error.message || "Failed to confirm payment");
      console.error(error);
    }
  };

  const copyBillId = (billId) => {
    navigator.clipboard.writeText(billId);
    toast.success("Bill ID copied!");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "awaiting_confirmation":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "open":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "awaiting_confirmation":
        return "Pending Confirm";
      case "completed":
        return "Completed";
      case "open":
        return "Open";
      default:
        return status;
    }
  };

  if (isLoading || paymentLoading) {
    return <LoadingSpinner />;
  }

  if (paymentError) {
    toast.error(paymentError);
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Bills Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            View and manage all bills
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-lg p-1">
          <button
            onClick={() => handleTabChange("all")}
            className={`
              px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium
              ${
                activeTab === "all"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <FileText size={18} />
            <span className="hidden sm:inline">All Bills</span>
            <span className="sm:hidden">All</span>
            <span
              className={`
              px-2 py-0.5 rounded-full text-xs font-bold
              ${
                activeTab === "all"
                  ? "bg-white/20"
                  : "bg-purple-500/20 text-purple-300"
              }
            `}
            >
              {allBills.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("confirm")}
            disabled={!isBartender}
            className={`
              px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium relative
              ${
                activeTab === "confirm"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : isBartender
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 cursor-not-allowed opacity-50"
              }
            `}
            title={!isBartender ? "Bartender access only" : ""}
          >
            {!isBartender && <Lock size={14} className="mr-1" />}
            <ClipboardCheck size={18} />
            <span className="hidden sm:inline">Confirm Payments</span>
            <span className="sm:hidden">Confirm</span>
            {awaitingConfirmation.length > 0 && isBartender && (
              <span
                className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${
                  activeTab === "confirm"
                    ? "bg-white/20"
                    : "bg-orange-500/20 text-orange-300 animate-pulse"
                }
              `}
              >
                {awaitingConfirmation.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* All Bills View */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="
                w-full pl-10 pr-10 py-3 rounded-lg
                bg-gray-900/40 backdrop-blur-md
                border border-purple-500/20
                text-white placeholder-gray-400
                focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                transition-all duration-200
              "
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-gray-400 px-1">
            <span>
              Showing{" "}
              {paginatedBills.length > 0
                ? (currentPage - 1) * ITEMS_PER_PAGE + 1
                : 0}{" "}
              - {Math.min(currentPage * ITEMS_PER_PAGE, filteredBills.length)}{" "}
              of {filteredBills.length}{" "}
              {filteredBills.length === 1 ? "bill" : "bills"}
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Bills Grid */}
          <div className="grid gap-4">
            {paginatedBills.map((bill, index) => {
              const totals = calculateBillTotals(bill);
              const isEvenRow = index % 2 === 0;

              return (
                <div
                  key={bill.id}
                  className={`
                    bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10 p-4 sm:p-5
                    transition-all duration-200
                    hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10
                    ${isEvenRow ? "bg-gray-900/30" : ""}
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    {/* Left Side - Bill Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 shrink-0">
                          <Receipt className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                              {bill.customer_name}
                            </h3>
                            <button
                              onClick={() => copyBillId(bill.id)}
                              className="p-1 rounded hover:bg-purple-500/20 transition-colors shrink-0"
                              title="Copy Bill ID"
                            >
                              <Copy size={14} className="text-purple-400" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-400">
                              Served By:{" "}
                              <span className="text-white font-medium">
                                {bill.waitress_name}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(bill.created_at).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(bill.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                            <p className="text-sm text-gray-400">
                              {bill?.rounds.length} round
                              {bill?.rounds.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Status and Amount */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-3">
                      <div
                        className={`px-3 py-1.5 rounded-lg border font-semibold text-sm whitespace-nowrap ${getStatusColor(
                          bill.status
                        )}`}
                      >
                        {getStatusLabel(bill.status)}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          KSh {totals.total.toLocaleString()}
                        </div>
                        {bill.payment_method && (
                          <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1">
                            {bill.payment_method}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {filteredBills.length === 0 && (
              <div className="text-center text-gray-400 py-16 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
                <Receipt size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No bills found</p>
                {searchQuery && (
                  <p className="text-sm mt-2">
                    Try adjusting your search query
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredBills.length > 0 && totalPages > 1 && (
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

                {/* Previous */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className={`
                    px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1
                    ${
                      currentPage === 1
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                    }
                  `}
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
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

                {/* Next */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`
                    px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1
                    ${
                      currentPage === totalPages
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                    }
                  `}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
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
        </div>
      )}

      {/* Confirm Payments View */}
      {activeTab === "confirm" && (
        <div className="space-y-4">
          {!isBartender ? (
            <div className="text-center text-gray-400 py-16 bg-linear-to-br from-red-900/20 to-red-900/10 backdrop-blur-sm rounded-xl border border-red-500/20">
              <Lock
                size={64}
                className="mx-auto mb-4 opacity-50 text-red-400"
              />
              <p className="text-xl font-medium text-red-400">
                Access Restricted
              </p>
              <p className="text-sm mt-2">
                Only bartenders can access payment confirmations
              </p>
            </div>
          ) : awaitingConfirmation.length > 0 ? (
            <div className="grid gap-4">
              {awaitingConfirmation.map((bill) => {
                const totals = calculateBillTotals(bill);

                return (
                  <div
                    key={bill.id}
                    className="bg-linear-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-md rounded-xl border-2 border-yellow-500/30 p-4 sm:p-6 shadow-lg shadow-yellow-500/10"
                  >
                    <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                      {/* Left: Customer & Server Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                            <AlertCircle className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">
                              {bill.customer_name}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                              Served By:{" "}
                              <span className="text-white font-medium">
                                {bill.created_by_user.name}
                              </span>
                            </p>
                            {bill.marked_paid_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Marked Paid:{" "}
                                {new Date(bill.marked_paid_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bill Details */}
                        <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10">
                          <h4 className="font-semibold text-sm text-purple-300 mb-3 flex items-center gap-2">
                            <Receipt size={16} />
                            Bill Details
                          </h4>
                          <div className="space-y-3">
                            {bill.rounds.map((round) => (
                              <div key={round.id}>
                                <div className="text-xs text-purple-400 font-semibold mb-1">
                                  Round {round.round_number}
                                </div>
                                <div className="space-y-1">
                                  {round.round_items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex justify-between text-sm"
                                    >
                                      <span className="text-gray-300">
                                        {item.quantity}x {item.product_name}
                                      </span>
                                      <span className="font-mono font-semibold text-pink-400">
                                        KSh{" "}
                                        {(item.price * item.quantity).toFixed(
                                          2
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Payment Info & Action */}
                      <div className="lg:w-80 flex flex-col gap-4">
                        <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10 space-y-3">
                          <div className="flex items-center justify-center">
                            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-sm font-semibold text-yellow-300">
                              Awaiting Confirmation
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-4xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                              KSh {totals.total.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-400 mt-2 uppercase font-semibold">
                              {bill.payments[0].payment_type}
                            </div>
                          </div>

                          {bill.mpesa_code && (
                            <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <span className="text-xs text-gray-400">
                                M-Pesa Code:
                              </span>
                              <span className="font-mono text-sm font-bold text-green-400">
                                {bill.mpesa_code}
                              </span>
                              <button
                                onClick={() => copyBillId(bill.mpesa_code)}
                                className="p-1 rounded hover:bg-green-500/20 transition-colors"
                              >
                                <Copy size={12} className="text-green-400" />
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleConfirmPayment(bill.id)}
                          className="w-full py-4 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-200 border border-green-500/30"
                        >
                          <Check size={24} />
                          Confirm Payment Received
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-16 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
              <ClipboardCheck
                size={64}
                className="mx-auto mb-4 opacity-50 text-green-400"
              />
              <p className="text-xl font-medium text-green-400">All Clear!</p>
              <p className="text-sm mt-2">No payments pending confirmation</p>
              <p className="text-xs text-gray-500 mt-1">
                Bills will appear here when staff mark them as paid
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillsManagement;

import { useState, useMemo } from "react";
import {
  Lock,
  ClipboardCheck,
  AlertCircle,
  Receipt,
  Check,
  Copy,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  calculateBillTotals,
  calculateBillPaymentInfo,
} from "../../utils/calculations";
import toast from "react-hot-toast";

/**
 * ConfirmPaymentsView Component
 *
 * Displays bills awaiting bartender confirmation in a sortable, searchable table format.
 * Features:
 * - Expandable rows to view bill details
 * - Search functionality (customer name, server, M-Pesa code)
 * - Sortable columns (customer, total, time, server, payment method)
 * - Responsive design (table on desktop, cards on mobile)
 * - Access control for bartender role
 */

const ConfirmPaymentsView = ({
  awaitingConfirmation,
  canAccessConfirm,
  onProcessPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "marked_paid_at",
    direction: "desc",
  });

  // Copy to clipboard helper
  const copyBillId = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  // Toggle row expansion
  const toggleExpand = (billId) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

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

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = awaitingConfirmation;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.created_by_user.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          bill.mpesa_code?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "customer_name":
          aValue = a.customer_name.toLowerCase();
          bValue = b.customer_name.toLowerCase();
          break;
        case "total":
          aValue = calculateBillTotals(a).total;
          bValue = calculateBillTotals(b).total;
          break;
        case "marked_paid_at":
          aValue = new Date(a.marked_paid_at || 0);
          bValue = new Date(b.marked_paid_at || 0);
          break;
        case "served_by":
          aValue = a.created_by_user.name.toLowerCase();
          bValue = b.created_by_user.name.toLowerCase();
          break;
        case "payment_method":
          aValue = (a.payments || [])
            .filter((p) => p.status === "pending")
            .map((p) => p.payment_type)
            .sort()
            .join(",") || "cash";
          bValue = (b.payments || [])
            .filter((p) => p.status === "pending")
            .map((p) => p.payment_type)
            .sort()
            .join(",") || "cash";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [awaitingConfirmation, searchTerm, sortConfig]);

  // Access restriction check
  if (!canAccessConfirm) {
    return (
      <div className="text-center text-gray-400 py-16 bg-linear-to-br from-red-900/20 to-red-900/10 backdrop-blur-sm rounded-xl border border-red-500/20">
        <Lock size={64} className="mx-auto mb-4 opacity-50 text-red-400" />
        <p className="text-xl font-medium text-red-400">Access Restricted</p>
        <p className="text-sm mt-2">
          Only bartenders can access payment confirmations
        </p>
      </div>
    );
  }

  // Empty state
  if (awaitingConfirmation.length === 0) {
    return (
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
    );
  }

  const handleConfirmPayment = async (bill) => {
    try {
      await onProcessPayment(bill);
      // toast.success("Payment confirmed");
    } catch (err) {
      toast.error(err.message || "Confirmation failed");
    } finally {
      setExpandedBillId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Pending Confirmations
            </h2>
            <p className="text-sm text-gray-400">
              {filteredAndSortedBills.length} payment
              {filteredAndSortedBills.length !== 1 ? "s" : ""} awaiting
              confirmation
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search customer, server, M-Pesa..."
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
      <div className="bg-gray-900/40 backdrop-blur-md rounded-xl border border-purple-500/20 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/60 border-b border-purple-500/20">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("customer_name")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Customer
                    {getSortIcon("customer_name")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("served_by")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Served By
                    {getSortIcon("served_by")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("payment_method")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Method
                    {getSortIcon("payment_method")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("total")}
                    className="flex items-center gap-2 ml-auto text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Total
                    {getSortIcon("total")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("marked_paid_at")}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors"
                  >
                    Time
                    {getSortIcon("marked_paid_at")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Action
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredAndSortedBills.map((bill) => {
                const totals = calculateBillTotals(bill);
                const paymentInfo = calculateBillPaymentInfo(bill);
                const pendingPayments = (bill.payments || []).filter(
                  (p) => p.status === "pending",
                );
                const paymentTypes = [
                  ...new Set(pendingPayments.map((p) => p.payment_type)),
                ];
                const isExpanded = expandedBillId === bill.id;

                return (
                  <>
                    {/* Main Row */}
                    <tr
                      key={bill.id}
                      className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(bill.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-purple-400" />
                          ) : (
                            <ChevronDown
                              size={16}
                              className="text-purple-400"
                            />
                          )}
                          <span className="font-semibold text-white">
                            {bill.customer_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-300">
                          {bill.created_by_user.name}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {paymentTypes.length > 0
                            ? paymentTypes.map((type) => (
                                <span
                                  key={type}
                                  className={`text-xs px-2 py-1 rounded-full uppercase font-semibold ${
                                    type === "mpesa"
                                      ? "bg-green-500/20 text-green-300"
                                      : "bg-purple-500/20 text-purple-300"
                                  }`}
                                >
                                  {type === "mpesa" ? "M-PESA" : type}
                                </span>
                              ))
                            : (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 uppercase font-semibold">
                                Cash
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div>
                          <span className="font-mono font-bold text-lg text-pink-400">
                            KSh {paymentInfo.pendingAmount.toLocaleString()}
                          </span>
                          {paymentInfo.amountPaid > 0 && (
                            <div className="text-xs text-green-400">
                              Paid: KSh {paymentInfo.amountPaid.toLocaleString()}
                            </div>
                          )}
                          {paymentInfo.balanceDue > paymentInfo.pendingAmount && (
                            <div className="text-xs text-yellow-400">
                              Unpaid: KSh{" "}
                              {(paymentInfo.balanceDue - paymentInfo.pendingAmount).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-400">
                          {bill.updated_at
                            ? new Date(bill.updated_at).toLocaleString(
                                "en-GB",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Africa/Nairobi",
                                },
                              )
                            : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmPayment(bill);
                          }}
                          className="px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-200 border border-green-500/30 mx-auto"
                        >
                          <Check size={16} />
                          Confirm
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row - Bill Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="6" className="px-4 py-4 bg-gray-800/20">
                          <div className="flex flex-col lg:flex-row gap-4">
                            {/* Bill Items */}
                            <div className="flex-1 bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10">
                              <h4 className="font-semibold text-sm text-purple-300 mb-3 flex items-center gap-2">
                                <Receipt size={16} />
                                Bill Items
                              </h4>
                              <div className="space-y-3">
                                {bill.rounds.map((round) => (
                                  <div key={round.id}>
                                    <div className="text-xs text-purple-400 font-semibold mb-1.5 flex items-center gap-2">
                                      <div className="h-px flex-1 bg-purple-500/20" />
                                      Round {round.round_number}
                                      <div className="h-px flex-1 bg-purple-500/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                      {round.round_items.map((item) => (
                                        <div
                                          key={item.product.id}
                                          className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-gray-800/40 transition-colors"
                                        >
                                          <span className="text-gray-300">
                                            <span className="font-semibold text-purple-400 mr-2">
                                              {item.quantity}x
                                            </span>
                                            {item.product.name}
                                          </span>
                                          <span className="font-mono font-semibold text-pink-400">
                                            KSh{" "}
                                            {(
                                              item.price * item.quantity
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Total Summary */}
                              <div className="mt-4 pt-3 border-t border-purple-500/20 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-purple-300">
                                    Bill Total
                                  </span>
                                  <span className="font-mono font-bold text-lg text-pink-400">
                                    KSh {totals.total.toFixed(2)}
                                  </span>
                                </div>
                                {paymentInfo.amountPaid > 0 && (
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-green-400">
                                      Already Paid
                                    </span>
                                    <span className="font-mono text-green-400">
                                      -KSh {paymentInfo.amountPaid.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Pending Payments Breakdown */}
                            {pendingPayments.length > 0 && (
                              <div className="lg:w-64">
                                <div className="bg-yellow-900/20 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/20">
                                  <h4 className="font-semibold text-sm text-yellow-300 mb-3">
                                    Pending Payments ({pendingPayments.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {pendingPayments.map((payment) => (
                                      <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                                      >
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                                            payment.payment_type === "mpesa"
                                              ? "bg-green-500/20 text-green-300"
                                              : "bg-purple-500/20 text-purple-300"
                                          }`}
                                        >
                                          {payment.payment_type === "mpesa"
                                            ? "M-PESA"
                                            : payment.payment_type}
                                        </span>
                                        <span className="font-mono font-bold text-yellow-300">
                                          KSh{" "}
                                          {parseFloat(
                                            payment.amount,
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* M-Pesa Code if available */}
                            {bill.mpesa_code && (
                              <div className="lg:w-64">
                                <div className="bg-green-900/20 backdrop-blur-sm rounded-lg p-4 border border-green-500/20">
                                  <h4 className="font-semibold text-sm text-green-300 mb-3">
                                    M-Pesa Transaction
                                  </h4>
                                  <div className="flex items-center justify-between gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div>
                                      <div className="text-xs text-gray-400 mb-1">
                                        Transaction Code
                                      </div>
                                      <div className="font-mono text-lg font-bold text-green-400">
                                        {bill.mpesa_code}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyBillId(bill.mpesa_code);
                                      }}
                                      className="p-2 rounded hover:bg-green-500/20 transition-colors"
                                    >
                                      <Copy
                                        size={16}
                                        className="text-green-400"
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-purple-500/10">
          {filteredAndSortedBills.map((bill) => {
            const totals = calculateBillTotals(bill);
            const paymentInfo = calculateBillPaymentInfo(bill);
            const pendingPayments = (bill.payments || []).filter(
              (p) => p.status === "pending",
            );
            const paymentTypes = [
              ...new Set(pendingPayments.map((p) => p.payment_type)),
            ];
            const isExpanded = expandedBillId === bill.id;

            return (
              <div key={bill.id} className="p-4">
                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(bill.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-purple-400 shrink-0" />
                        ) : (
                          <ChevronDown size={18} className="text-purple-400 shrink-0" />
                        )}
                        <h3 className="text-lg font-bold text-white truncate">
                          {bill.customer_name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 ml-6 truncate">
                        Served by: {bill.created_by_user.name}
                      </p>
                      {bill.marked_paid_at && (
                        <p className="text-xs text-gray-500 ml-6 mt-1">
                          {new Date(bill.marked_paid_at).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xl text-pink-400">
                        KSh {paymentInfo.pendingAmount.toLocaleString()}
                      </div>
                      <div className="flex gap-1 mt-1 justify-end flex-wrap">
                        {paymentTypes.length > 0
                          ? paymentTypes.map((type) => (
                              <span
                                key={type}
                                className={`text-xs px-2 py-1 rounded-full uppercase font-semibold ${
                                  type === "mpesa"
                                    ? "bg-green-500/20 text-green-300"
                                    : "bg-purple-500/20 text-purple-300"
                                }`}
                              >
                                {type === "mpesa" ? "M-PESA" : type}
                              </span>
                            ))
                          : (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 uppercase font-semibold">
                              Cash
                            </span>
                          )}
                      </div>
                      {paymentInfo.amountPaid > 0 && (
                        <div className="text-xs text-green-400 mt-1">
                          Paid: KSh {paymentInfo.amountPaid.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* M-Pesa Code (if available) */}
                  {bill.mpesa_code && !isExpanded && (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                      <span className="text-xs text-gray-400">M-Pesa:</span>
                      <span className="font-mono text-sm font-bold text-green-400 flex-1">
                        {bill.mpesa_code}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyBillId(bill.mpesa_code);
                        }}
                        className="p-1 rounded hover:bg-green-500/20 transition-colors"
                      >
                        <Copy size={14} className="text-green-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {/* Bill Items */}
                    <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-3 border border-purple-500/10">
                      <h4 className="font-semibold text-xs text-purple-300 mb-2 flex items-center gap-2">
                        <Receipt size={14} />
                        Bill Items
                      </h4>
                      <div className="space-y-2">
                        {bill.rounds.map((round) => (
                          <div key={round.id}>
                            <div className="text-xs text-purple-400 font-semibold mb-1">
                              Round {round.round_number}
                            </div>
                            <div className="space-y-1">
                              {round.round_items.map((item) => (
                                <div
                                  key={item.product.id}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-300">
                                    <span className="font-semibold text-purple-400 mr-1">
                                      {item.quantity}x
                                    </span>
                                    {item.product.name}
                                  </span>
                                  <span className="font-mono font-semibold text-pink-400">
                                    KSh{" "}
                                    {(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Payments Breakdown */}
                    {pendingPayments.length > 0 && (
                      <div className="bg-yellow-900/20 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/20">
                        <h4 className="font-semibold text-xs text-yellow-300 mb-2">
                          Pending Payments ({pendingPayments.length})
                        </h4>
                        <div className="space-y-1.5">
                          {pendingPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                            >
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                                  payment.payment_type === "mpesa"
                                    ? "bg-green-500/20 text-green-300"
                                    : "bg-purple-500/20 text-purple-300"
                                }`}
                              >
                                {payment.payment_type === "mpesa"
                                  ? "M-PESA"
                                  : payment.payment_type}
                              </span>
                              <span className="font-mono font-bold text-yellow-300 text-sm">
                                KSh{" "}
                                {parseFloat(payment.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* M-Pesa Code (expanded view) */}
                    {bill.mpesa_code && (
                      <div className="bg-green-900/20 backdrop-blur-sm rounded-lg p-3 border border-green-500/20">
                        <h4 className="font-semibold text-xs text-green-300 mb-2">
                          M-Pesa Transaction
                        </h4>
                        <div className="flex items-center justify-between gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-400">Code</div>
                            <div className="font-mono text-sm font-bold text-green-400">
                              {bill.mpesa_code}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyBillId(bill.mpesa_code);
                            }}
                            className="p-2 rounded hover:bg-green-500/20 transition-colors"
                          >
                            <Copy size={14} className="text-green-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmPayment(bill);
                  }}
                  className="w-full mt-3 py-3 bg-linear-to-r from-green-600 to-emerald-600 active:from-green-700 active:to-emerald-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all duration-200 border border-green-500/30"
                >
                  <Check size={18} />
                  Confirm Payment Received
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* No Results */}
      {filteredAndSortedBills.length === 0 && searchTerm && (
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg">No bills found matching "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-2 text-purple-400 hover:text-purple-300 text-sm underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfirmPaymentsView;

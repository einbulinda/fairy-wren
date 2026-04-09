import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { calculateBillPaymentInfo } from "../../utils/calculations";

const OpenBillsModal = ({ bills, onSelectBill, onClose, title }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase();
    return bills.filter(
      (bill) =>
        bill.customer_name?.toLowerCase().includes(q) ||
        bill.id?.toLowerCase().includes(q),
    );
  }, [bills, search]);

  const totalValue = useMemo(
    () => bills.reduce((sum, bill) => sum + calculateBillPaymentInfo(bill).balanceDue, 0),
    [bills],
  );

  const dateRange = useMemo(() => {
    if (bills.length === 0) return null;
    const fmt = (d) =>
      new Date(d).toLocaleString("en-KE", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
    const sorted = [...bills].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const earliest = sorted[0].created_at;
    const latest = sorted[sorted.length - 1].created_at;
    return earliest === latest ? fmt(earliest) : `${fmt(earliest)} — ${fmt(latest)}`;
  }, [bills]);

  const oldestDays = bills.length > 0
    ? Math.floor((new Date().getTime() - new Date([...bills].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-purple-500/30 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-purple-500/20 shrink-0">
          <div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {title || "Open Bills"} ({bills.length})
            </h3>
            {bills.length > 0 && (
              <>
                <p className="text-sm text-gray-400 mt-1">
                  Outstanding:{" "}
                  <span className="text-pink-400 font-semibold">
                    KSh.{" "}
                    {totalValue.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{dateRange}</p>
                {oldestDays > 0 && (
                  <p className={`text-xs mt-1 font-medium ${oldestDays >= 7 ? "text-red-500 animate-pulse" : "text-orange-400"}`}>
                    Please note you are holding open bills more than {oldestDays} day{oldestDays !== 1 ? "s" : ""}. Close bills once paid.
                  </p>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 pt-4 shrink-0">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or bill ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-purple-500/20 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Bills List */}
        <div className="overflow-y-auto space-y-3 flex-1 p-4 sm:p-6">
          {filtered.map((bill) => {
            const { total, balanceDue, amountPaid } = calculateBillPaymentInfo(bill);
            const safeRounds = bill?.rounds ?? [];
            const hasPartialPayment = amountPaid > 0;
            return (
              <div
                key={bill.id}
                onClick={() => onSelectBill(bill)}
                className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border-2 border-purple-500/30 hover:border-pink-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20 active:scale-98"
              >
                <div className="flex justify-between items-start gap-3">
                  {/* Left side - Bill info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-white truncate">
                      {bill.customer_name}
                    </h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <p className="text-xs sm:text-sm text-gray-400">
                        Bill #{bill?.id.slice(0, 8)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      {safeRounds.length} round
                      {safeRounds.length !== 1 ? "s" : ""}
                    </p>
                    {hasPartialPayment && (
                      <p className="text-xs text-gray-500 mt-1">
                        Bill: KSh. {total.toFixed(2)} · Paid: <span className="text-emerald-400">KSh. {amountPaid.toFixed(2)}</span>
                      </p>
                    )}
                  </div>

                  {/* Right side - Status and Outstanding */}
                  <div className="text-right shrink-0">
                    <div className="px-2 sm:px-3 py-1 bg-green-600 rounded-full text-xs sm:text-sm font-semibold mb-2 whitespace-nowrap">
                      Open
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-pink-500 whitespace-nowrap">
                      KSh. {balanceDue.toFixed(2)}
                    </div>
                    {hasPartialPayment && (
                      <p className="text-xs text-amber-400 mt-0.5">outstanding</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-gray-500 text-center py-12 sm:py-16">
              <p className="text-base sm:text-lg">
                {search.trim()
                  ? "No bills match your search."
                  : "No open bills available."}
              </p>
            </div>
          )}
        </div>

        {/* Footer - Close button on mobile */}
        <div className="sm:hidden p-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default OpenBillsModal;

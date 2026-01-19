import { useState, useEffect } from "react";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useInventoryReports } from "../../hooks/inventory/useInventoryReports";

export default function StockTakeAdjustmentsReport() {
  const { stockTakeReports, loading } = useInventoryReports();
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchReport = async () => {
    try {
      setHasSearched(true);
      const res = await stockTakeReports({ startDate, endDate });

      const payload = Array.isArray(res) ? res : (res?.data ?? []);
      setData(payload);
    } catch (error) {
      console.error(error);
      setData([]);
    }
  };

  // Auto-fetch on mount with no date filters
  useEffect(() => {
    fetchReport();
  }, []);

  // Group data by stock take ID - add safety check
  const groupedData = (data || []).reduce((acc, item) => {
    if (!acc[item.stockTakeId]) {
      acc[item.stockTakeId] = {
        stockTakeId: item.stockTakeId,
        completedAt: item.completedAt,
        createdAt: item.createdAt,
        performedBy: item.performedBy,
        items: [],
        totalAdjustments: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
      };
    }
    acc[item.stockTakeId].items.push(item);
    acc[item.stockTakeId].totalAdjustments += Math.abs(item.adjustment);
    if (item.adjustment > 0) {
      acc[item.stockTakeId].positiveAdjustments += item.adjustment;
    } else if (item.adjustment < 0) {
      acc[item.stockTakeId].negativeAdjustments += Math.abs(item.adjustment);
    }
    return acc;
  }, {});

  const stockTakeSessions = Object.values(groupedData).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const getStatusBadge = (completedAt) => {
    if (completedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
        In Progress
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-4 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-3">
          Stock Take Adjustments
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? "Loading..." : "Filter"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-8 border border-white/10 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-300">Loading adjustments...</p>
        </div>
      ) : stockTakeSessions.length === 0 && hasSearched ? (
        <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-8 border border-white/10 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-300">No stock take adjustments found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your date filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stockTakeSessions.map((session) => (
            <div
              key={session.stockTakeId}
              className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Session Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-400" />
                    <span className="text-sm text-gray-300">
                      {session.completedAt
                        ? new Date(session.completedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : new Date(session.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                    </span>
                    {getStatusBadge(session.completedAt)}
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    ID: {session.stockTakeId.slice(0, 8)}...
                  </span>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Added</span>
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                      +{session.positiveAdjustments}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <TrendingDown className="w-3 h-3" />
                      <span>Removed</span>
                    </div>
                    <div className="text-lg font-semibold text-red-400">
                      -{session.negativeAdjustments}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Minus className="w-3 h-3" />
                      <span>Items</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {session.items.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-white/10">
                {session.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1 truncate">
                          {item.productName}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span>System: {item.systemQty}</span>
                          <span>Physical: {item.physicalQty}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-lg font-bold ${
                            item.adjustment > 0
                              ? "text-green-400"
                              : item.adjustment < 0
                                ? "text-red-400"
                                : "text-gray-400"
                          }`}
                        >
                          {item.adjustment > 0 && "+"}
                          {item.adjustment}
                        </span>
                        <span className="text-xs text-gray-400">
                          adjustment
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Package,
  FileText,
  Filter,
  Download,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  TrendingUp as TrendUp,
  Activity,
} from "lucide-react";
import { useInventoryReports } from "../../hooks/inventory/useInventoryReports";

const StockTakeReports = () => {
  const { stockTakeReports, loading } = useInventoryReports();
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'completed', 'pending', 'approved', 'flagged'
  const [filterUser, setFilterUser] = useState("all");
  const [selectedSession, setSelectedSession] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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

  // Group data by stock take ID with enhanced metrics
  const groupedData = (data || []).reduce((acc, item) => {
    if (!acc[item.stockTakeId]) {
      acc[item.stockTakeId] = {
        stockTakeId: item.stockTakeId,
        completedAt: item.completedAt,
        createdAt: item.createdAt,
        performedBy: item.performedBy,
        performedById: item.performedById,
        performedByRole: item.performedByRole,
        stockTakeName: item.stockTakeName,
        stockTakeType: item.stockTakeType,
        location: item.location,
        reviewedBy: item.reviewedBy,
        reviewedAt: item.reviewedAt,
        approvalStatus: item.approvalStatus || "pending",
        approvalNotes: item.approvalNotes,
        items: [],
        totalAdjustments: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
        totalValueImpact: 0,
        shrinkageValue: 0,
        overageValue: 0,
        flaggedItems: 0,
      };
    }

    const valueImpact = (item.adjustment || 0) * (item.costPerUnit || 0);

    acc[item.stockTakeId].items.push(item);
    acc[item.stockTakeId].totalAdjustments += Math.abs(item.adjustment || 0);

    if (item.adjustment > 0) {
      acc[item.stockTakeId].positiveAdjustments += item.adjustment;
      acc[item.stockTakeId].overageValue += valueImpact;
    } else if (item.adjustment < 0) {
      acc[item.stockTakeId].negativeAdjustments += Math.abs(item.adjustment);
      acc[item.stockTakeId].shrinkageValue += Math.abs(valueImpact);
    }

    acc[item.stockTakeId].totalValueImpact += valueImpact;

    // Flag items with large adjustments or high variance
    if (
      Math.abs(item.adjustment) > 10 ||
      (item.variancePercentage && Math.abs(item.variancePercentage) > 20)
    ) {
      acc[item.stockTakeId].flaggedItems += 1;
    }

    return acc;
  }, {});

  const stockTakeSessions = Object.values(groupedData).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  // Apply filters
  const filteredSessions = stockTakeSessions.filter((session) => {
    if (filterStatus !== "all") {
      if (filterStatus === "completed" && !session.completedAt) return false;
      if (filterStatus === "pending" && session.completedAt) return false;
      if (filterStatus === "approved" && session.approvalStatus !== "approved")
        return false;
      if (filterStatus === "flagged" && session.flaggedItems === 0)
        return false;
    }

    if (filterUser !== "all" && session.performedBy !== filterUser) {
      return false;
    }

    return true;
  });

  // Calculate KPIs
  const kpis = filteredSessions.reduce(
    (acc, session) => {
      acc.totalSessions += 1;
      acc.completedSessions += session.completedAt ? 1 : 0;
      acc.totalShrinkage += session.shrinkageValue;
      acc.totalOverage += session.overageValue;
      acc.totalValueImpact += session.totalValueImpact;
      acc.flaggedSessions += session.flaggedItems > 0 ? 1 : 0;

      session.items.forEach((item) => {
        acc.totalItems += 1;
        if (item.adjustment === 0) acc.accurateItems += 1;
      });

      return acc;
    },
    {
      totalSessions: 0,
      completedSessions: 0,
      totalShrinkage: 0,
      totalOverage: 0,
      totalValueImpact: 0,
      totalItems: 0,
      accurateItems: 0,
      flaggedSessions: 0,
    },
  );

  const completionRate =
    kpis.totalSessions > 0
      ? ((kpis.completedSessions / kpis.totalSessions) * 100).toFixed(1)
      : 0;
  const accuracyRate =
    kpis.totalItems > 0
      ? ((kpis.accurateItems / kpis.totalItems) * 100).toFixed(1)
      : 0;

  // Get unique users for filter
  const uniqueUsers = [
    ...new Set(stockTakeSessions.map((s) => s.performedBy)),
  ].filter(Boolean);

  const getStatusBadge = (session) => {
    if (!session.completedAt) {
      const hoursSinceCreation =
        (new Date() - new Date(session.createdAt)) / (1000 * 60 * 60);
      const isStale = hoursSinceCreation > 24;

      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isStale
              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          }`}
        >
          <Clock className="w-3 h-3" />
          In Progress {isStale && "(>24h)"}
        </span>
      );
    }

    if (session.approvalStatus === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    }

    if (session.approvalStatus === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <Clock className="w-3 h-3" />
        Pending Review
      </span>
    );
  };

  const getAlertLevel = (item) => {
    const absAdjustment = Math.abs(item.adjustment || 0);
    const variance = Math.abs(item.variancePercentage || 0);

    if (absAdjustment > 50 || variance > 50) {
      return { level: "critical", color: "text-red-400", icon: AlertTriangle };
    }
    if (absAdjustment > 10 || variance > 20) {
      return { level: "warning", color: "text-yellow-400", icon: AlertCircle };
    }
    return { level: "normal", color: "text-gray-400", icon: null };
  };

  const exportToCSV = () => {
    const headers = [
      "Stock Take ID",
      "Date",
      "Status",
      "Performed By",
      "Product",
      "System Qty",
      "Physical Qty",
      "Adjustment",
      "Variance %",
      "Cost Impact",
      "Reason",
    ];

    const rows = filteredSessions.flatMap((session) =>
      session.items.map((item) => [
        session.stockTakeId,
        session.completedAt || session.createdAt,
        session.approvalStatus,
        session.performedBy,
        item.productName,
        item.systemQty,
        item.physicalQty,
        item.adjustment,
        item.variancePercentage?.toFixed(2) || "",
        (item.totalValueAdjustment || 0).toFixed(2),
        item.reason || "",
      ]),
    );

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-take-adjustments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header with KPI Dashboard */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Stock Take Adjustments
          </h2>
          <button
            onClick={exportToCSV}
            disabled={filteredSessions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        {hasSearched && filteredSessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Activity className="w-3 h-3" />
                <span>Completion Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {completionRate}%
              </div>
              <div className="text-xs text-gray-400">
                {kpis.completedSessions}/{kpis.totalSessions} completed
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <CheckCircle className="w-3 h-3" />
                <span>Accuracy Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {accuracyRate}%
              </div>
              <div className="text-xs text-gray-400">
                {kpis.accurateItems}/{kpis.totalItems} exact matches
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <TrendingDown className="w-3 h-3" />
                <span>Shrinkage</span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                KES {kpis.totalShrinkage.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">Total loss value</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <DollarSign className="w-3 h-3" />
                <span>Net Impact</span>
              </div>
              <div
                className={`text-2xl font-bold ${kpis.totalValueImpact >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                KES {kpis.totalValueImpact.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">
                {kpis.flaggedSessions} flagged sessions
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          {/* Date Filters */}
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
              <label className="block text-xs text-gray-300 mb-1">
                End Date
              </label>
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
                {loading ? "Loading..." : "Search"}
              </button>
            </div>
          </div>

          {/* Additional Filters */}
          {hasSearched && stockTakeSessions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-300 mb-1">
                  <Filter className="w-3 h-3 inline mr-1" />
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">In Progress</option>
                  <option value="approved">Approved</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-300 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Performed By
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  <option value="all">All Users</option>
                  {uniqueUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-8 border border-white/10 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-300">Loading adjustments...</p>
        </div>
      ) : filteredSessions.length === 0 && hasSearched ? (
        <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl p-8 border border-white/10 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-300">No stock take adjustments found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.stockTakeId}
              className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Session Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex flex-col gap-3">
                  {/* Top Row - Date, Status, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">
                        {session.completedAt
                          ? new Date(session.completedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : new Date(session.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                      </span>
                      {getStatusBadge(session)}
                      {session.flaggedItems > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          {session.flaggedItems} Flagged
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {session.performedBy === "Unknown User" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          No User Data
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Stock Take Info */}
                  {(session.stockTakeName || session.location) && (
                    <div className="flex items-center gap-3 text-sm">
                      {session.stockTakeName && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <FileText className="w-3 h-3" />
                          <span>{session.stockTakeName}</span>
                        </div>
                      )}
                      {session.location && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <Package className="w-3 h-3" />
                          <span>{session.location}</span>
                        </div>
                      )}
                      {session.stockTakeType && (
                        <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                          {session.stockTakeType}
                        </span>
                      )}
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-300">
                      <User className="w-3 h-3" />
                      <span className="font-medium">
                        {session.performedBy || "Unknown"}
                      </span>
                      {session.performedByRole && (
                        <span className="text-xs text-gray-400">
                          ({session.performedByRole})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      ID: {session.stockTakeId.slice(0, 8)}...
                    </span>
                  </div>

                  {/* Reviewed Info */}
                  {session.reviewedBy && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg p-2">
                      <CheckCircle className="w-3 h-3" />
                      <span>
                        Reviewed by {session.reviewedBy} on{" "}
                        {new Date(session.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Approval Notes */}
                  {session.approvalNotes && (
                    <div className="bg-white/5 rounded-lg p-2 text-xs text-gray-300">
                      <span className="font-medium">Notes: </span>
                      {session.approvalNotes}
                    </div>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Added</span>
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                      +{session.positiveAdjustments}
                    </div>
                    {session.overageValue > 0 && (
                      <div className="text-xs text-gray-400">
                        KES {session.overageValue.toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <TrendingDown className="w-3 h-3" />
                      <span>Removed</span>
                    </div>
                    <div className="text-lg font-semibold text-red-400">
                      -{session.negativeAdjustments}
                    </div>
                    {session.shrinkageValue > 0 && (
                      <div className="text-xs text-gray-400">
                        KES {session.shrinkageValue.toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Net Value</span>
                    </div>
                    <div
                      className={`text-lg font-semibold ${session.totalValueImpact >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {session.totalValueImpact >= 0 ? "+" : ""}
                      {session.totalValueImpact.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-400">KES</div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Package className="w-3 h-3" />
                      <span>Items</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {session.items.length}
                    </div>
                    {session.flaggedItems > 0 && (
                      <div className="text-xs text-red-400">
                        {session.flaggedItems} flagged
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Minus className="w-3 h-3" />
                      <span>Accuracy</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {(
                        (session.items.filter((i) => i.adjustment === 0)
                          .length /
                          session.items.length) *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                    <div className="text-xs text-gray-400">
                      {session.items.filter((i) => i.adjustment === 0).length}/
                      {session.items.length} exact
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                {session.items.map((item, idx) => {
                  const alert = getAlertLevel(item);
                  const AlertIcon = alert.icon;

                  return (
                    <div
                      key={idx}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white truncate">
                              {item.productName}
                            </h4>
                            {AlertIcon && (
                              <AlertIcon className={`w-4 h-4 ${alert.color}`} />
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span>System: {item.systemQty}</span>
                            <span>Physical: {item.physicalQty}</span>
                            <span>
                              Variance: {item.physicalQty - item.systemQty}
                            </span>
                            {item.variancePercentage !== undefined && (
                              <span
                                className={
                                  Math.abs(item.variancePercentage) > 20
                                    ? "text-red-400"
                                    : ""
                                }
                              >
                                Variance:{" "}
                                {item?.variancePercentage
                                  ? item.variancePercentage.toFixed(1)
                                  : 0}
                                %
                              </span>
                            )}
                          </div>

                          {item.reason && (
                            <div className="mt-1 text-xs text-gray-400">
                              <span className="font-medium">Reason: </span>
                              {item.reason}
                            </div>
                          )}

                          {item.notes && (
                            <div className="mt-1 text-xs text-gray-400 italic">
                              "{item.notes}"
                            </div>
                          )}
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
                          {item.totalValueAdjustment !== undefined && (
                            <span
                              className={`text-sm ${
                                item.totalValueAdjustment >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              KES{" "}
                              {Math.abs(item.totalValueAdjustment).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 sticky top-0 bg-gradient-to-br from-pink-500/10 to-purple-600/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Stock Take Details
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">ID:</span>
                  <div className="text-white font-mono text-xs mt-1">
                    {selectedSession.stockTakeId}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedSession)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Performed By:</span>
                  <div className="text-white mt-1">
                    {selectedSession.performedBy}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <div className="text-white mt-1">
                    {new Date(selectedSession.createdAt).toLocaleString()}
                  </div>
                </div>
                {selectedSession.completedAt && (
                  <div>
                    <span className="text-gray-400">Completed:</span>
                    <div className="text-white mt-1">
                      {new Date(selectedSession.completedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-white font-semibold mb-3">
                Adjustment Summary
              </h4>
              <div className="space-y-2">
                {selectedSession.items.map((item, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">
                        {item.productName}
                      </span>
                      <span
                        className={`font-bold ${
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
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div>System: {item.systemQty}</div>
                      <div>Physical: {item.physicalQty}</div>
                      <div>Variance: {item.physicalQty - item.systemQty}</div>
                      {item.variancePercentage !== undefined && (
                        <>
                          <div>
                            Variance:{" "}
                            {item.variancePercentage
                              ? item.variancePercentage.toFixed(1)
                              : 0}
                            %
                          </div>
                          {item.totalValueAdjustment !== undefined && (
                            <div>
                              Value: KES {item.totalValueAdjustment.toFixed(0)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTakeReports;

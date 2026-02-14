import { useState, useEffect } from "react";
import {
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useInventoryReports } from "../../hooks/inventory/useInventoryReports";
import { inventoryService } from "../../services/inventory.service";

const ApprovalTab = () => {
  const { stockTakeReports } = useInventoryReports();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending"); // 'pending', 'approved', 'rejected', 'all'
  const [expandedSession, setExpandedSession] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approve' or 'reject'
  const [selectedSession, setSelectedSession] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch stocktake reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await stockTakeReports({});
      const payload = Array.isArray(res) ? res : (res?.data ?? []);

      // Group by stockTakeId
      const grouped = (payload || []).reduce((acc, item) => {
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
            totalValueImpact: 0,
          };
        }

        const valueImpact = (item.adjustment || 0) * (item.costPerUnit || 0);
        acc[item.stockTakeId].items.push(item);
        acc[item.stockTakeId].totalValueImpact += valueImpact;

        return acc;
      }, {});

      const sortedSessions = Object.values(grouped).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      setSessions(sortedSessions);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    if (filterStatus === "pending") {
      return (
        session.approvalStatus === "pending" ||
        session.approvalStatus === "under_review"
      );
    }
    if (filterStatus === "approved") {
      return session.approvalStatus === "approved";
    }
    if (filterStatus === "rejected") {
      return session.approvalStatus === "rejected";
    }
    return true; // 'all'
  });

  const handleOpenApprovalModal = (session, action) => {
    setSelectedSession(session);
    setModalAction(action);
    setApprovalNotes("");
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedSession) return;

    // Reject requires notes
    if (modalAction === "reject" && !approvalNotes.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setSubmitting(true);
      if (modalAction === "approve") {
        await inventoryService.approveStockTake(selectedSession.stockTakeId, {
          notes: approvalNotes.trim() || null,
        });
      } else {
        await inventoryService.rejectStockTake(selectedSession.stockTakeId, {
          notes: approvalNotes.trim(),
        });
      }

      setShowApprovalModal(false);
      setApprovalNotes("");
      setSelectedSession(null);
      await fetchReports(); // Refresh the list
    } catch (error) {
      console.error("Error processing approval:", error);
      alert("Error processing approval. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-900/30",
        text: "text-yellow-400",
        label: "Pending",
      },
      under_review: {
        bg: "bg-orange-900/30",
        text: "text-orange-400",
        label: "Under Review",
      },
      approved: {
        bg: "bg-green-900/30",
        text: "text-green-400",
        label: "Approved",
      },
      rejected: {
        bg: "bg-red-900/30",
        text: "text-red-400",
        label: "Rejected",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
      >
        {status === "pending" && <Clock className="w-3 h-3" />}
        {status === "under_review" && <AlertTriangle className="w-3 h-3" />}
        {status === "approved" && <CheckCircle className="w-3 h-3" />}
        {status === "rejected" && <XCircle className="w-3 h-3" />}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["pending", "approved", "rejected", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${
                filterStatus === status
                  ? "bg-purple-600/50 text-purple-300 border border-purple-400/50"
                  : "bg-gray-900/30 text-gray-400 border border-gray-700 hover:border-gray-600"
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading stocktake reports...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSessions.length === 0 && (
        <div className="text-center py-12 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
          <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            No stocktake reports with status "{filterStatus}"
          </p>
        </div>
      )}

      {/* Sessions Table */}
      {!loading && filteredSessions.length > 0 && (
        <div className="bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">
                    Performed By
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-300">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-300">
                    Adjustment Value
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <>
                    <tr
                      key={session.stockTakeId}
                      className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-300">
                        {formatDate(session.completedAt || session.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-400" />
                        {session.performedBy}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {session.items.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            session.totalValueImpact >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          KSh{" "}
                          {Math.abs(session.totalValueImpact).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(session.approvalStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setExpandedSession(
                              expandedSession === session.stockTakeId
                                ? null
                                : session.stockTakeId,
                            )
                          }
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <ChevronDown
                            className={`w-5 h-5 transition-transform ${
                              expandedSession === session.stockTakeId
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row - Items Details */}
                    {expandedSession === session.stockTakeId && (
                      <tr className="bg-gray-900/40">
                        <td colSpan="6" className="px-4 py-4">
                          <div className="space-y-4">
                            {/* Session Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-gray-900/30 rounded-lg border border-purple-500/10">
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">
                                  Stock Take Name
                                </p>
                                <p className="text-gray-300 font-medium">
                                  {session.stockTakeName}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">
                                  Type
                                </p>
                                <p className="text-gray-300 font-medium">
                                  {session.stockTakeType}
                                </p>
                              </div>
                              {session.reviewedBy && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    Reviewed By
                                  </p>
                                  <p className="text-gray-300 font-medium">
                                    {session.reviewedBy}
                                  </p>
                                </div>
                              )}
                              {session.approvalNotes && (
                                <div className="sm:col-span-2">
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    Approval Notes
                                  </p>
                                  <p className="text-gray-300 bg-gray-900/50 p-2 rounded text-xs">
                                    {session.approvalNotes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Items Table */}
                            <div>
                              <h4 className="font-semibold text-gray-300 mb-2">
                                Items in this stocktake
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-900/50 border-b border-purple-500/10">
                                      <th className="px-2 py-2 text-left text-gray-400">
                                        Product
                                      </th>
                                      <th className="px-2 py-2 text-center text-gray-400">
                                        System
                                      </th>
                                      <th className="px-2 py-2 text-center text-gray-400">
                                        Physical
                                      </th>
                                      <th className="px-2 py-2 text-center text-gray-400">
                                        Adjustment
                                      </th>
                                      <th className="px-2 py-2 text-left text-gray-400">
                                        Reason
                                      </th>
                                      <th className="px-2 py-2 text-left text-gray-400">
                                        Notes
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {session.items.map((item, itemIdx) => (
                                      <tr
                                        key={itemIdx}
                                        className="border-b border-purple-500/5 hover:bg-gray-900/30"
                                      >
                                        <td className="px-2 py-2 text-gray-300">
                                          <div>
                                            <p className="font-medium">
                                              {item.productName}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                              {item.productCode}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 text-center text-gray-300">
                                          {item.systemQty}
                                        </td>
                                        <td className="px-2 py-2 text-center text-gray-300">
                                          {item.physicalQty}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                          <span
                                            className={`font-semibold ${
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
                                        </td>
                                        <td className="px-2 py-2 text-gray-300">
                                          <span className="bg-gray-900/50 px-2 py-1 rounded text-xs">
                                            {item.reason || "-"}
                                          </span>
                                        </td>
                                        <td className="px-2 py-2 text-gray-400 max-w-xs">
                                          <p className="truncate text-xs">
                                            {item.notes || "-"}
                                          </p>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {(session.approvalStatus === "pending" ||
                              session.approvalStatus === "under_review") && (
                              <div className="flex gap-2 justify-end pt-4 border-t border-purple-500/10">
                                <button
                                  onClick={() =>
                                    handleOpenApprovalModal(session, "reject")
                                  }
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors border border-red-500/30"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                                <button
                                  onClick={() =>
                                    handleOpenApprovalModal(session, "approve")
                                  }
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors border border-green-500/30"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {modalAction === "approve"
                  ? "Approve Stocktake"
                  : "Reject Stocktake"}
              </h3>
              <p className="text-gray-400 mb-4">
                {modalAction === "approve"
                  ? `Approve stocktake performed by ${selectedSession.performedBy}?`
                  : `Reject stocktake performed by ${selectedSession.performedBy}?`}
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">
                    {modalAction === "approve"
                      ? "Approval Notes (optional)"
                      : "Rejection Reason (required)"}
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder={
                      modalAction === "approve"
                        ? "Add any notes about approval..."
                        : "Explain why you're rejecting this stocktake..."
                    }
                    className="w-full bg-gray-900/50 border border-purple-500/20 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    rows="4"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalNotes("");
                  }}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApproval}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                    modalAction === "approve"
                      ? "bg-green-900/50 text-green-400 hover:bg-green-900/70 border border-green-500/30"
                      : "bg-red-900/50 text-red-400 hover:bg-red-900/70 border border-red-500/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitting
                    ? "Submitting..."
                    : modalAction === "approve"
                      ? "Approve"
                      : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalTab;

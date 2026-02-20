import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle,
  XCircle,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useStockTakeReports,
  useApproveStockTake,
  useRejectStockTake,
} from "@/hooks/useInventory";
import { PAGE_SIZE } from "./inventoryUtils";

const StatusBadge = ({ status }) => {
  const map = {
    under_review: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-surface-700 text-surface-400"}`}
    >
      {status?.replace("_", " ") || "pending"}
    </span>
  );
};

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return <ChevronUp size={12} className="opacity-30" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-primary-400" />
  ) : (
    <ChevronDown size={12} className="text-primary-400" />
  );
};

const ApprovalsTab = () => {
  const navigate = useNavigate();
  const { data: all = [], isLoading, refetch } = useStockTakeReports();
  const approveMutation = useApproveStockTake();
  const rejectMutation = useRejectStockTake();

  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  const pending = useMemo(
    () =>
      (all || []).filter(
        (r) =>
          r.approval_status === "pending" ||
          r.approval_status === "under_review",
      ),
    [all],
  );

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...pending].sort((a, b) => {
      let av, bv;
      if (sortCol === "name") {
        av = (a.stock_take_name || "").toLowerCase();
        bv = (b.stock_take_name || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === "performed_by") {
        av = (a.profiles?.name || "").toLowerCase();
        bv = (b.profiles?.name || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === "created_at") {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      } else if (sortCol === "items") {
        av = a.stock_take_items?.length ?? 0;
        bv = b.stock_take_items?.length ?? 0;
      } else if (sortCol === "status") {
        av = a.approval_status || "";
        bv = b.approval_status || "";
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      } else {
        return 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [pending, sortCol, sortDir]);

  useEffect(() => setPage(1), [sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thCls =
    "px-4 py-3 text-left cursor-pointer select-none hover:text-white transition-colors";

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-12 text-center text-surface-400 text-sm">
          No stock takes pending approval.
        </div>
      ) : (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
              <tr>
                <th className={thCls} onClick={() => handleSort("name")}>
                  <span className="flex items-center gap-1">
                    Stock Take Name{" "}
                    <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
                <th className={thCls} onClick={() => handleSort("created_at")}>
                  <span className="flex items-center gap-1">
                    Date Submitted{" "}
                    <SortIcon
                      col="created_at"
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className={thCls}
                  onClick={() => handleSort("performed_by")}
                >
                  <span className="flex items-center gap-1">
                    Performed By{" "}
                    <SortIcon
                      col="performed_by"
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className={thCls + " text-center"}
                  onClick={() => handleSort("items")}
                >
                  <span className="flex items-center justify-center gap-1">
                    Items{" "}
                    <SortIcon
                      col="items"
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className={thCls + " text-center"}
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center justify-center gap-1">
                    Status{" "}
                    <SortIcon
                      col="status"
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {paginated.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-surface-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {session.stock_take_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-surface-300">
                    {new Date(session.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-surface-300">
                    {session.profiles?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300">
                    {session.stock_take_items?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={session.approval_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() =>
                          navigate(`/inventory/reports/${session.id}`, {
                            state: { from: "approvals" },
                          })
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={() =>
                          approveMutation.mutate(session.id, {
                            onSuccess: refetch,
                          })
                        }
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() =>
                          rejectMutation.mutate(session.id, {
                            onSuccess: refetch,
                          })
                        }
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
              <p className="text-xs text-surface-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 text-xs text-surface-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalsTab;

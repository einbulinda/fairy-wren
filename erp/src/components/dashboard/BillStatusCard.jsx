import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  completed: { label: "Paid", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  open: { label: "Open", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/15" },
  awaiting_confirmation: { label: "Pending", icon: Clock, color: "text-orange-400", bg: "bg-orange-500/15" },
  void: { label: "Voided", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15" },
};

const BillStatusCard = ({ data }) => {
  const getCount = (status) => {
    if (!data) return 0;
    const found = data.find((d) => d.status === status);
    return found ? Number(found.count) : 0;
  };

  const totalBills = data?.reduce((sum, d) => sum + Number(d.count), 0) || 0;
  const completed = getCount("completed");
  const voided = getCount("void");
  const open = getCount("open");
  const pending = getCount("awaiting_confirmation");
  const outstanding = open + pending;

  const statuses = [
    { key: "completed", count: completed },
    { key: "void", count: voided },
    { key: "open", count: open },
    { key: "awaiting_confirmation", count: pending },
  ];

  return (
    <div>
      {/* Total bills header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-orange-400" />
          <span className="text-surface-400 text-sm">Total Bills</span>
        </div>
        <span className="text-2xl font-bold text-white">{totalBills}</span>
      </div>

      {/* Status breakdown */}
      <div className="space-y-2.5">
        {statuses.map(({ key, count }) => {
          const config = STATUS_CONFIG[key];
          const Icon = config.icon;
          const pct = totalBills > 0 ? ((count / totalBills) * 100).toFixed(1) : 0;
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${config.bg}`}>
                  <Icon size={14} className={config.color} />
                </div>
                <span className="text-surface-300 text-sm">{config.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-surface-500 text-xs">{pct}%</span>
                <span className="text-white font-semibold text-sm w-8 text-right">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outstanding highlight */}
      {outstanding > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-700/50 flex items-center justify-between">
          <span className="text-orange-400 text-xs font-medium">Outstanding</span>
          <span className="text-orange-400 font-bold">{outstanding}</span>
        </div>
      )}
    </div>
  );
};

export default BillStatusCard;

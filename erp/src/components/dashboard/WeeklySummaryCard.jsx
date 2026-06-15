import { BarChart3 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "Africa/Nairobi" });

const WeeklySummaryCard = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-surface-400">
        <p>No weekly data available</p>
      </div>
    );
  }

  // Show the most recent week
  const currentWeek = data[data.length - 1];
  const prevWeek = data.length > 1 ? data[data.length - 2] : null;

  const revenue = Number(currentWeek.total_revenue);
  const prevRevenue = prevWeek ? Number(prevWeek.total_revenue) : 0;
  const weekGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Current week header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-primary-400" />
          <span className="text-sm text-surface-300 font-medium">Week {currentWeek.week_number}</span>
        </div>
        <span className="text-xs text-surface-500">
          {formatDate(currentWeek.week_start)} – {formatDate(currentWeek.week_end)}
        </span>
      </div>

      {/* Revenue */}
      <div>
        <p className="text-2xl font-bold text-white">{formatCurrency(revenue)}</p>
        {prevWeek && (
          <span className={`text-xs font-medium ${weekGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {weekGrowth >= 0 ? "+" : ""}{weekGrowth.toFixed(1)}% vs prev week
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-800/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-white">{currentWeek.total_bills}</p>
          <p className="text-xs text-surface-500">Bills</p>
        </div>
        <div className="bg-surface-800/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-white">{currentWeek.total_transactions}</p>
          <p className="text-xs text-surface-500">Transactions</p>
        </div>
        <div className="bg-surface-800/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-white">{formatCurrency(currentWeek.avg_bill_value)}</p>
          <p className="text-xs text-surface-500">Avg Bill</p>
        </div>
      </div>

      {/* Week-over-week bars */}
      {data.length > 1 && (
        <div className="space-y-1.5">
          {data.slice(-4).map((week, i) => {
            const maxRev = Math.max(...data.slice(-4).map((w) => Number(w.total_revenue)));
            const pct = maxRev > 0 ? (Number(week.total_revenue) / maxRev) * 100 : 0;
            const isCurrent = i === data.slice(-4).length - 1;
            return (
              <div key={week.week_number} className="flex items-center gap-2">
                <span className={`text-xs w-8 ${isCurrent ? "text-white font-semibold" : "text-surface-500"}`}>W{week.week_number}</span>
                <div className="flex-1 h-2.5 bg-surface-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isCurrent ? "bg-gradient-to-r from-primary-600 to-primary-400" : "bg-surface-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklySummaryCard;

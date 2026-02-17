import { BarChart3 } from "lucide-react";

const WeeklyPerformanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p>No weekly data available for this period</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((w) => Number(w.total_revenue)));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4">
      {data.map((week, index) => {
        const revenue = Number(week.total_revenue);
        const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400" />
                <span className="text-gray-300 font-medium">
                  Week {week.week_number}
                </span>
                <span className="text-gray-500 text-xs">
                  {formatDate(week.week_start)} - {formatDate(week.week_end)}
                </span>
              </div>
              <span className="text-white font-semibold">
                {formatCurrency(revenue)}
              </span>
            </div>

            <div className="relative h-10 bg-gray-800/50 rounded-lg overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-lg flex items-center justify-end px-3"
                style={{ width: `${percentage}%` }}
              >
                {percentage > 20 && (
                  <span className="text-white text-xs font-semibold">
                    {week.total_bills} bills
                  </span>
                )}
              </div>
              {percentage <= 20 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  {week.total_bills} bills
                </span>
              )}
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>Avg: {formatCurrency(week.avg_bill_value)}</span>
              <span>{week.total_transactions} transactions</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyPerformanceChart;

import { Calendar, TrendingUp, Users } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const MonthlyPerformanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-surface-400"><p>No monthly data available</p></div>;
  }

  const maxRevenue = Math.max(...data.map((m) => Number(m.total_revenue)));

  const dataWithGrowth = data.map((month, index) => {
    if (index === 0) return { ...month, growth: 0 };
    const prev = Number(data[index - 1].total_revenue);
    const curr = Number(month.total_revenue);
    return { ...month, growth: prev > 0 ? ((curr - prev) / prev) * 100 : 0 };
  });

  return (
    <div className="space-y-4">
      {dataWithGrowth.map((month, index) => {
        const revenue = Number(month.total_revenue);
        const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
        const isPositive = month.growth >= 0;
        return (
          <div key={index} className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary-400" />
                <span className="text-white font-semibold">{month.month_name} {month.year}</span>
              </div>
              {index > 0 && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-success" : "text-danger"}`}>
                  <TrendingUp size={14} className={isPositive ? "" : "rotate-180"} />
                  <span>{isPositive ? "+" : ""}{month.growth.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <span className="text-2xl font-bold text-white">{formatCurrency(revenue)}</span>
              <div className="relative h-3 bg-surface-800/50 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500 rounded-full" style={{ width: `${percentage}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-surface-400 text-xs">Bills</p><p className="text-white font-semibold">{month.total_bills}</p></div>
                <div><p className="text-surface-400 text-xs">Avg Bill</p><p className="text-white font-semibold">{formatCurrency(month.avg_bill_value)}</p></div>
                <div><p className="text-surface-400 text-xs flex items-center gap-1"><Users size={12} />Customers</p><p className="text-white font-semibold">{month.unique_customers}</p></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonthlyPerformanceChart;
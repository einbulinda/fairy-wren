const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const DayOfWeekChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-surface-400"><p>No day of week data available</p></div>;
  }

  const maxRevenue = Math.max(...data.map((d) => Number(d.total_revenue)));
  const sortedData = [...data].sort((a, b) => a.day_of_week - b.day_of_week);

  const getDayColor = (dow) => (dow === 0 || dow === 6) ? "from-orange-500 to-orange-400" : "from-primary-600 to-primary-400";
  const getDayBg = (dow) => (dow === 0 || dow === 6) ? "bg-orange-500/10 border-orange-500/20" : "bg-primary-500/10 border-primary-500/20";

  return (
    <div className="space-y-3">
      {sortedData.map((day, index) => {
        const revenue = Number(day.total_revenue);
        const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
        const isWeekend = day.day_of_week === 0 || day.day_of_week === 6;
        return (
          <div key={index} className={`border rounded-lg p-3 ${getDayBg(day.day_of_week)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold w-24">{day.day_name}</span>
                {isWeekend && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">Weekend</span>}
              </div>
              <span className="text-white font-bold">{formatCurrency(revenue)}</span>
            </div>
            <div className="relative h-6 bg-surface-800/50 rounded-md overflow-hidden mb-2">
              <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getDayColor(day.day_of_week)} transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="flex justify-between text-xs text-surface-400">
              <span>{day.total_bills} bills</span>
              <span>Avg: {formatCurrency(day.avg_bill_value)}</span>
              <span>{day.total_transactions} txns</span>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-center gap-6 pt-4 text-xs">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary-600 to-primary-400" /><span className="text-surface-400">Weekdays</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400" /><span className="text-surface-400">Weekends</span></div>
      </div>
    </div>
  );
};

export default DayOfWeekChart;
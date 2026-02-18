import { Sun, Briefcase } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const WeekendWeekdayComparison = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-surface-400"><p>No weekend/weekday data available</p></div>;
  }

  const weekendData = data.find((d) => d.period_type === "Weekend") || {};
  const weekdayData = data.find((d) => d.period_type === "Weekday") || {};
  const totalRevenue = Number(weekendData.total_revenue || 0) + Number(weekdayData.total_revenue || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3"><Sun size={20} className="text-orange-400" /><h3 className="text-white font-semibold">Weekend</h3></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(weekendData.total_revenue || 0)}</p>
          <div className="flex items-center gap-2 text-sm mt-1"><span className="text-orange-400 font-semibold">{weekendData.revenue_percentage || 0}%</span><span className="text-surface-400">of total</span></div>
          <div className="pt-2 space-y-1 text-xs text-surface-400"><p>Bills: {weekendData.total_bills || 0}</p><p>Avg: {formatCurrency(weekendData.avg_bill_value || 0)}</p></div>
        </div>
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3"><Briefcase size={20} className="text-primary-400" /><h3 className="text-white font-semibold">Weekday</h3></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(weekdayData.total_revenue || 0)}</p>
          <div className="flex items-center gap-2 text-sm mt-1"><span className="text-primary-400 font-semibold">{weekdayData.revenue_percentage || 0}%</span><span className="text-surface-400">of total</span></div>
          <div className="pt-2 space-y-1 text-xs text-surface-400"><p>Bills: {weekdayData.total_bills || 0}</p><p>Avg: {formatCurrency(weekdayData.avg_bill_value || 0)}</p></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm"><span className="text-surface-400">Revenue Split</span><span className="text-white font-semibold">{formatCurrency(totalRevenue)}</span></div>
        <div className="flex h-8 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center text-white text-xs font-semibold" style={{ width: `${weekendData.revenue_percentage || 0}%` }}>{(weekendData.revenue_percentage || 0) > 15 && "Weekend"}</div>
          <div className="bg-gradient-to-r from-primary-500 to-primary-400 flex items-center justify-center text-white text-xs font-semibold" style={{ width: `${weekdayData.revenue_percentage || 0}%` }}>{(weekdayData.revenue_percentage || 0) > 15 && "Weekday"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-surface-800/30 rounded-lg p-3"><p className="text-surface-400 text-xs mb-1">Weekend Txns</p><p className="text-white font-bold text-lg">{weekendData.total_transactions || 0}</p></div>
        <div className="bg-surface-800/30 rounded-lg p-3"><p className="text-surface-400 text-xs mb-1">Weekday Txns</p><p className="text-white font-bold text-lg">{weekdayData.total_transactions || 0}</p></div>
      </div>
    </div>
  );
};

export default WeekendWeekdayComparison;
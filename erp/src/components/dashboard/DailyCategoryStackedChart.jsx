import { useMemo } from "react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATEGORY_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4","#a855f7"];

function buildCategoryColors(categories) {
  const map = {};
  categories.forEach((cat, i) => { map[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });
  return map;
}

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const DailyCategoryStackedChart = ({ data, selectedMonth, selectedYear }) => {
  const { dates, dailyData, categories, categoryColors, maxTotal, categoryTotals } = useMemo(() => {
    if (!data || data.length === 0) return { dates: [], dailyData: {}, categories: [], categoryColors: {}, maxTotal: 0, categoryTotals: {} };
    const dates = [...new Set(data.map((d) => d.sale_date))].sort();
    const categories = [...new Set(data.map((d) => d.category_name))];
    const categoryColors = buildCategoryColors(categories);
    const dailyData = {};
    const categoryTotals = {};
    dates.forEach((date) => {
      const rows = data.filter((d) => d.sale_date === date);
      const total = rows.reduce((sum, d) => sum + Number(d.category_sales), 0);
      const byCategory = {};
      rows.forEach((d) => { byCategory[d.category_name] = Number(d.category_sales); categoryTotals[d.category_name] = (categoryTotals[d.category_name] || 0) + Number(d.category_sales); });
      dailyData[date] = { total, byCategory };
    });
    return { dates, dailyData, categories, categoryColors, maxTotal: Math.max(...dates.map((d) => dailyData[d].total)), categoryTotals };
  }, [data]);

  if (!dates.length) return <div className="flex items-center justify-center h-64 text-surface-400 text-sm">No sales data for {MONTH_NAMES[selectedMonth]} {selectedYear}</div>;

  const yAxisStep = 5000;
  const yAxisLevels = Math.max(1, Math.ceil(maxTotal / yAxisStep));
  const yAxisMax = yAxisLevels * yAxisStep;
  const yAxisLabels = Array.from({ length: yAxisLevels + 1 }, (_, i) => i * yAxisStep);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-xs text-surface-400 text-right shrink-0 w-16 pb-6">
          {[...yAxisLabels].reverse().map((label, i) => <span key={i}>{formatCurrency(label)}</span>)}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative h-72 overflow-visible">
            {yAxisLabels.map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-surface-700/30 pointer-events-none" style={{ bottom: `${(i / yAxisLevels) * 100}%` }} />)}
            <div className="absolute inset-0 flex gap-2 px-1">
              {dates.map((date) => {
                const { total, byCategory } = dailyData[date];
                const heightPct = yAxisMax > 0 ? (total / yAxisMax) * 100 : 0;
                return (
                  <div key={date} className="flex-1 flex flex-col justify-end h-full relative">
                    <div className="group w-full relative transition-all duration-200 hover:brightness-110 cursor-crosshair" style={{ height: `${heightPct}%`, minHeight: "4px", borderRadius: "4px 4px 0 0" }}>
                      <div className="w-full h-full flex flex-col overflow-hidden">
                        {[...categories].sort((a, b) => (byCategory[b] || 0) - (byCategory[a] || 0)).map((cat) => {
                          const val = byCategory[cat] || 0;
                          const pct = total > 0 ? (val / total) * 100 : 0;
                          if (pct === 0) return null;
                          return <div key={cat} className="w-full" style={{ height: `${pct}%`, backgroundColor: categoryColors[cat], borderBottom: pct > 5 ? "1px solid rgba(0,0,0,0.1)" : "none" }} />;
                        })}
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full mb-3 hidden group-hover:block z-50 pointer-events-none w-max">
                        <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 shadow-2xl">
                          <p className="text-white text-xs font-bold border-b border-surface-700 pb-1.5 mb-1.5">{new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                          <p className="text-white text-xs font-bold mb-1.5">Total: {formatCurrency(total)}</p>
                          <div className="space-y-1">
                            {categories.map((cat) => {
                              const val = byCategory[cat] || 0;
                              if (!val) return null;
                              return (
                                <div key={cat} className="flex items-center gap-2 text-xs">
                                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: categoryColors[cat] }} />
                                  <span className="text-surface-300 truncate max-w-[120px]">{cat}</span>
                                  <span className="text-surface-400 ml-auto pl-2 whitespace-nowrap">{formatCurrency(val)}</span>
                                  <span className="text-white font-medium">({((val / total) * 100).toFixed(1)}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-surface-800" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 px-1">{dates.map((date) => <div key={date} className="flex-1 text-center text-xs text-surface-400 truncate font-medium">{new Date(date).getDate()}</div>)}</div>
          <div className="text-center text-xs text-surface-500 font-medium mt-1">Days of {MONTH_NAMES[selectedMonth]} {selectedYear}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-surface-700/50 pt-3">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: categoryColors[cat] }} />
            <span className="text-surface-300 text-xs font-medium">{cat}</span>
            <span className="text-surface-500 text-xs">({formatCurrency(categoryTotals[cat] || 0)})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyCategoryStackedChart;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WeeklyInsightsCard = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        <p className="text-xs">No day data available</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.day_of_week - b.day_of_week);
  // Reorder to Mon–Sun (shift Sunday from index 0 to end)
  const reordered = [...sorted.filter((d) => d.day_of_week !== 0), ...sorted.filter((d) => d.day_of_week === 0)];
  const maxRevenue = Math.max(...data.map((d) => Number(d.total_revenue)), 1);

  return (
    <div className="space-y-2.5">
      {reordered.map((day) => {
        const revenue = Number(day.total_revenue);
        const pct = (revenue / maxRevenue) * 100;
        const isWeekend = day.day_of_week === 0 || day.day_of_week === 6;
        const label = DAY_LABELS[day.day_of_week] || day.day_name?.slice(0, 3);

        return (
          <div key={day.day_of_week} className="flex items-center gap-3">
            <span className={`text-xs w-7 shrink-0 ${isWeekend ? "text-orange-400 font-semibold" : "text-surface-400"}`}>
              {label}
            </span>
            <div className="flex-1 relative h-2.5">
              <div className="absolute inset-0 bg-surface-800/50 rounded-full" />
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isWeekend ? "bg-orange-500" : "bg-primary-500"}`}
                style={{ width: `${pct}%` }}
              />
              {/* Dot marker at end */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface-900 ${isWeekend ? "bg-orange-400" : "bg-primary-400"}`}
                style={{ left: `calc(${pct}% - 5px)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyInsightsCard;

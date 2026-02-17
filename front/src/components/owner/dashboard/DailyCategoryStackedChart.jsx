import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

const DailyCategoryStackedChart = ({ data, selectedMonth, selectedYear }) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  // Process data to get unique dates and categories
  const processedData = useMemo(() => {
    if (!data || data.length === 0)
      return { dates: [], categories: [], dailyData: {}, maxTotal: 0 };

    // Get unique dates and sort them
    const dates = [...new Set(data.map((d) => d.sale_date))].sort();

    // Get unique categories with colors
    const categoriesSet = new Set(data.map((d) => d.category_name));
    const categoryColors = generateCategoryColors([...categoriesSet]);

    // Organize data by date
    const dailyData = {};
    dates.forEach((date) => {
      const dateData = data.filter((d) => d.sale_date === date);
      const total = dateData.reduce(
        (sum, d) => sum + Number(d.category_sales),
        0,
      );

      dailyData[date] = {
        total,
        categories: dateData.reduce((acc, d) => {
          acc[d.category_name] = Number(d.category_sales);
          return acc;
        }, {}),
      };
    });

    // Find max total for scaling
    const maxTotal = Math.max(...dates.map((date) => dailyData[date].total));

    return {
      dates,
      categories: [...categoriesSet],
      categoryColors,
      dailyData,
      maxTotal,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No daily sales data available for this month</p>
      </div>
    );
  }

  const { dates, categories, categoryColors, dailyData, maxTotal } =
    processedData;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDay = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDate(); // Just the day number
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Calculate Y-axis labels with fixed 5000 increment
  const yAxisStep = 5000;
  const yAxisLevels = Math.max(1, Math.ceil(maxTotal / yAxisStep));
  const yAxisMax = yAxisLevels * yAxisStep;
  const yAxisLabels = Array.from(
    { length: yAxisLevels + 1 },
    (_, i) => i * yAxisStep,
  );

  return (
    <div className="space-y-6">
      {/* Chart Title */}
      {selectedMonth !== undefined && selectedYear !== undefined && (
        <div className="text-center">
          <h3 className="text-base font-semibold text-white">
            {months[selectedMonth]} {selectedYear}
          </h3>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 pr-2">
          {yAxisLabels.reverse().map((label, index) => (
            <div key={index} className="text-right">
              {formatCurrency(label)}
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="ml-20 md:ml-24">
          {/* Grid Lines */}
          <div className="relative h-80">
            {yAxisLabels.map((_, index) => (
              <div
                key={index}
                className="absolute left-0 right-0 border-t border-gray-700/30"
                style={{
                  bottom: `${(index / yAxisLevels) * 100}%`,
                }}
              />
            ))}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-between px-2">
              {dates.map((date, index) => {
                const dayData = dailyData[date];
                const dayTotal = dayData.total;
                const barHeightPercent =
                  yAxisMax > 0 ? (dayTotal / yAxisMax) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex flex-col justify-end group relative"
                    style={{ width: `${100 / dates.length}%` }}
                  >
                    {/* Stacked Bar */}
                    <div
                      className="relative rounded-t-sm overflow-hidden bg-purple-600/30 border-2 border-purple-500/40 hover:border-purple-400 transition-all duration-200 mx-auto"
                      style={{
                        height:
                          barHeightPercent > 0 ? `${barHeightPercent}%` : "0%",
                        minHeight: dayTotal > 0 ? "8px" : "0px",
                        width: "85%",
                      }}
                    >
                      {/* Category Segments */}
                      <div className="h-full flex flex-col-reverse">
                        {categories.map((category) => {
                          const categoryValue =
                            dayData.categories[category] || 0;
                          const categoryPercentage =
                            dayTotal > 0 ? (categoryValue / dayTotal) * 100 : 0;

                          if (categoryPercentage === 0) return null;

                          return (
                            <div
                              key={category}
                              className="relative hover:opacity-90 transition-opacity"
                              style={{
                                height: `${categoryPercentage}%`,
                                backgroundColor: categoryColors[category],
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-2xl min-w-max">
                        <p className="text-white text-xs font-semibold mb-2 border-b border-gray-700 pb-1">
                          {formatFullDate(date)}
                        </p>
                        <p className="text-purple-400 text-xs font-bold mb-2">
                          Total: {formatCurrency(dayTotal)}
                        </p>
                        <div className="space-y-1">
                          {categories.map((category) => {
                            const categoryValue =
                              dayData.categories[category] || 0;
                            const categoryPercentage =
                              dayTotal > 0
                                ? (categoryValue / dayTotal) * 100
                                : 0;

                            if (categoryPercentage === 0) return null;

                            return (
                              <div
                                key={category}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div
                                  className="w-2 h-2 rounded-sm flex-shrink-0"
                                  style={{
                                    backgroundColor: categoryColors[category],
                                  }}
                                />
                                <span className="text-gray-300 truncate max-w-[120px]">
                                  {category}
                                </span>
                                <span className="text-gray-400 ml-auto">
                                  {formatCurrency(categoryValue)}
                                </span>
                                <span className="text-purple-400 font-semibold">
                                  ({categoryPercentage.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Day Label */}
                    <div className="text-center text-xs text-gray-400 mt-2">
                      {formatDay(date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-sm text-gray-400 mt-2 font-medium">
            Days of Month
          </div>
        </div>

        {/* Y-Axis Label */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-gray-400 font-medium whitespace-nowrap origin-center">
          Revenue (KES)
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-purple-400" />
          <p className="text-gray-400 text-xs font-semibold">Categories</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: categoryColors[category] }}
              />
              <span className="text-gray-300 text-xs truncate">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to generate distinct colors for categories
function generateCategoryColors(categories) {
  const colors = [
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#F59E0B", // amber
    "#10B981", // emerald
    "#3B82F6", // blue
    "#EF4444", // red
    "#14B8A6", // teal
    "#F97316", // orange
    "#A855F7", // violet
    "#06B6D4", // cyan
  ];

  const colorMap = {};
  categories.forEach((category, index) => {
    colorMap[category] = colors[index % colors.length];
  });

  return colorMap;
}

export default DailyCategoryStackedChart;

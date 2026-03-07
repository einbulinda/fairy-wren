import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const CategoryDoughnutCard = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        <p className="text-xs">No category data</p>
      </div>
    );
  }

  const chartData = data
    .map((item) => ({
      name: item.category_name || "Uncategorized",
      value: parseFloat(item.total_sales) || 0,
      quantity: item.total_quantity || 0,
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-3 shadow-lg" style={{ opacity: 0.8 }}>
          <p className="text-white font-semibold mb-1">{d.name}</p>
          <p className="text-primary-400 text-sm">{formatCurrency(d.value)}</p>
          <p className="text-surface-400 text-xs">{pct}% &bull; {d.payload.quantity} items</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-surface-500 text-[10px] uppercase tracking-wider">Revenue</span>
        <span className="text-white text-lg font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default CategoryDoughnutCard;

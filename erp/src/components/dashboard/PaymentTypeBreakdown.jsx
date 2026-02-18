import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = {
  mpesa: "#10b981",
  cash: "#3b82f6",
};

const getColor = (name, index) => COLORS[name] || `hsl(${index * 60 + 200}, 60%, 55%)`;

const PaymentTypeBreakdown = ({ data }) => {
  const chartData = data.map((item) => ({
    name: item.payment_type,
    value: parseFloat(item.total_amount) || 0,
    count: item.count || 0,
  }));

  const renderLabel = (entry) => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    return `${((entry.value / total) * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      return (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-1">{d.name}</p>
          <p className="text-emerald-400 text-sm">Amount: KES {d.value.toLocaleString()}</p>
          <p className="text-surface-400 text-xs">Transactions: {d.payload.count}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-surface-400">No payment data available</div>;
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={renderLabel} outerRadius={100} dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-surface-300 text-sm">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => {
          const total = chartData.reduce((sum, i) => sum + i.value, 0);
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between p-2 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(item.name, index) }} />
                <span className="text-white text-sm">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold text-sm">KES {item.value.toLocaleString()}</div>
                <div className="text-surface-400 text-xs">{percentage}% &bull; {item.count} txns</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentTypeBreakdown;
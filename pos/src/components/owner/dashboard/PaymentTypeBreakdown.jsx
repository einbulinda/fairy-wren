import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const PaymentTypeBreakdown = ({ data }) => {
  // Transform data for pie chart
  const chartData = data.map((item) => ({
    name: item.payment_type,
    value: parseFloat(item.total_amount) || 0,
    count: item.count || 0,
  }));

  // Define colors for different payment types
  const COLORS = {
    mpesa: "#00A651", // Safaricom green
    cash: "#ef4444", // red
  };

  const getColor = (name, index) => {
    return COLORS[name] || `hsl(${index * 45}, 70%, 50%)`;
  };

  // Custom label to show percentage
  const renderLabel = (entry) => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const percent = ((entry.value / total) * 100).toFixed(1);
    return `${percent}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-1">{data.name}</p>
          <p className="text-green-400 text-sm">
            Amount: KES {data.value.toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs">
            Transactions: {data.payload.count}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No payment data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-gray-300 text-sm">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Table */}
      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => {
          const total = chartData.reduce((sum, i) => sum + i.value, 0);
          const percentage = ((item.value / total) * 100).toFixed(1);

          return (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(item.name, index) }}
                />
                <span className="text-white text-sm">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold text-sm">
                  KES {item.value.toLocaleString()}
                </div>
                <div className="text-gray-400 text-xs">
                  {percentage}% • {item.count} txns
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentTypeBreakdown;

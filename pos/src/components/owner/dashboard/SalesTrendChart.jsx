import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-purple-500/30 rounded-lg p-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">
          {payload[0].payload.business_date}
        </p>
        <p className="text-white font-bold text-lg">
          KSh {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const SalesTrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
      <defs>
        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
      <XAxis
        dataKey="business_date"
        stroke="#9ca3af"
        fontSize={12}
        tickLine={false}
      />
      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
      <Tooltip content={<CustomTooltip />} />
      <Line
        type="monotone"
        dataKey="total_revenue"
        stroke="#a855f7"
        strokeWidth={3}
        dot={{ fill: "#a855f7", r: 4 }}
        activeDot={{ r: 6, fill: "#ec4899" }}
        fill="url(#colorRevenue)"
      />
    </LineChart>
  </ResponsiveContainer>
);

export default SalesTrendChart;

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { DollarSign, ShoppingBag, TrendingUp } from "lucide-react";

const PERIODS = ["Today", "Weekly", "Monthly", "Annual"];

const formatCurrency = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toLocaleString();
};

const formatFullCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(value);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-800 border border-surface-600 rounded-lg p-3 shadow-xl">
        <p className="text-surface-400 text-xs mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-surface-300 text-xs">{entry.name}:</span>
            <span className="text-white text-xs font-bold">
              {entry.name === "Revenue" ? formatFullCurrency(entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SalesTrendChart = ({ data, monthlyData, revenueGrowth, hourlyData }) => {
  const [period, setPeriod] = useState("Monthly");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { chartData, xKey } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], xKey: "label" };

    if (period === "Today") {
      if (hourlyData && hourlyData.length > 0) {
        const hourMap = {};
        hourlyData.forEach((h) => { hourMap[h.hour] = h; });
        const chartPoints = [];
        for (let h = 0; h < 24; h++) {
          const entry = hourMap[h];
          const label = `${h.toString().padStart(2, "0")}:00`;
          chartPoints.push({
            label,
            revenue: entry ? Number(entry.total_revenue) : 0,
            orders: entry ? Number(entry.total_orders) : 0,
          });
        }
        return { chartData: chartPoints, xKey: "label" };
      }
      const todayEntry = data.find((d) => d.business_date === todayStr);
      const entry = todayEntry || data[data.length - 1];
      return {
        chartData: entry
          ? [{ label: "Today", revenue: Number(entry.total_revenue), orders: Number(entry.total_orders || 0) }]
          : [],
        xKey: "label",
      };
    }

    if (period === "Weekly") {
      const last7 = data.slice(-7);
      return {
        chartData: last7.map((d) => ({
          label: new Date(d.business_date).toLocaleDateString("en-US", { weekday: "short" }),
          revenue: Number(d.total_revenue),
          orders: Number(d.total_orders || 0),
        })),
        xKey: "label",
      };
    }

    if (period === "Annual" && monthlyData && monthlyData.length > 0) {
      return {
        chartData: monthlyData.map((m) => ({
          label: m.month_name?.trim().slice(0, 3) || `M${m.month_start}`,
          revenue: Number(m.total_revenue),
          orders: Number(m.total_bills || 0),
        })),
        xKey: "label",
      };
    }

    // Monthly (default)
    return {
      chartData: data.map((d) => ({
        label: new Date(d.business_date).getDate().toString(),
        revenue: Number(d.total_revenue),
        orders: Number(d.total_orders || 0),
      })),
      xKey: "label",
    };
  }, [data, monthlyData, hourlyData, period, todayStr]);

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = chartData.reduce((s, d) => s + d.orders, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Sales Report</h2>
          <span className="text-surface-500 text-sm">({totalOrders.toLocaleString()} Orders)</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-800/50 border border-surface-700 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary-500 text-white"
                  : "text-surface-400 hover:text-white hover:bg-surface-700/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/15">
            <DollarSign size={18} className="text-primary-400" />
          </div>
          <div>
            <p className="text-surface-500 text-xs">Revenue</p>
            <p className="text-white font-bold text-lg">KES {formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15">
            <ShoppingBag size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-surface-500 text-xs">Orders</p>
            <p className="text-white font-bold text-lg">{totalOrders.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/15">
            <TrendingUp size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-surface-500 text-xs">Growth Rate</p>
            <p className={`font-bold text-lg ${(revenueGrowth || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(revenueGrowth || 0) >= 0 ? "+" : ""}{revenueGrowth || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-surface-400">
          <p>No data available for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis
              yAxisId="revenue"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-surface-300 text-xs">{value}</span>}
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#7c3aed"
              strokeWidth={2.5}
              fill="url(#gradRevenue)"
              dot={false}
              activeDot={{ r: 5, fill: "#7c3aed", stroke: "#1e1b4b", strokeWidth: 2 }}
            />
            <Area
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#gradOrders)"
              dot={false}
              activeDot={{ r: 5, fill: "#10b981", stroke: "#064e3b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SalesTrendChart;

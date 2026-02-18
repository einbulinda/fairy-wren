const colorSchemes = {
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    text: "text-emerald-400",
  },
  blue: {
    bg: "bg-primary-500/10",
    border: "border-primary-500/20",
    icon: "text-primary-400",
    text: "text-primary-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    icon: "text-orange-400",
    text: "text-orange-400",
  },
  purple: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "text-violet-400",
    text: "text-violet-400",
  },
};

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const KPICard = ({ title, value, icon, color, highlight, isCurrency = false, trend }) => {
  const scheme = colorSchemes[color] || colorSchemes.blue;

  const formatValue = (val) => {
    if (val === null || val === undefined) return "0";
    const numValue = typeof val === "number" ? val : parseFloat(val) || 0;
    if (isCurrency) return `KES ${numValue.toLocaleString()}`;
    return numValue.toLocaleString();
  };

  const renderTrend = () => {
    if (!trend) return null;
    const val = trend.value;
    const isPositive = val > 0;
    const isNeutral = val === 0;
    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const trendColor = isNeutral
      ? "text-surface-400 bg-surface-700/50"
      : isPositive
        ? "text-emerald-400 bg-emerald-500/15"
        : "text-red-400 bg-red-500/15";

    return (
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendColor}`}>
          <Icon size={12} />
          {isNeutral ? "0%" : `${isPositive ? "+" : ""}${val}%`}
        </span>
        {trend.label && <span className="text-xs text-surface-500">{trend.label}</span>}
      </div>
    );
  };

  return (
    <div
      className={`
        ${scheme.bg} border ${scheme.border} rounded-xl p-5
        ${highlight ? "ring-1 ring-emerald-500/30" : ""}
        transition-transform duration-200 hover:scale-[1.02]
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-surface-800/50 ${scheme.icon}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-surface-400 text-sm font-medium mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${scheme.text}`}>
        {formatValue(value)}
      </p>
      {renderTrend()}
    </div>
  );
};

export default KPICard;
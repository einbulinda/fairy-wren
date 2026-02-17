// Update your KPICard component to handle both currency and numeric values

import React from "react";

const KPICard = ({
  title,
  value,
  icon,
  color,
  highlight,
  isCurrency = false,
}) => {
  // Color schemes
  const colorSchemes = {
    green: {
      bg: "from-green-500/20 to-emerald-600/20",
      border: "border-green-500/30",
      icon: "text-green-400",
      text: "text-green-400",
    },
    blue: {
      bg: "from-blue-500/20 to-cyan-600/20",
      border: "border-blue-500/30",
      icon: "text-blue-400",
      text: "text-blue-400",
    },
    orange: {
      bg: "from-orange-500/20 to-amber-600/20",
      border: "border-orange-500/30",
      icon: "text-orange-400",
      text: "text-orange-400",
    },
    purple: {
      bg: "from-purple-500/20 to-pink-600/20",
      border: "border-purple-500/30",
      icon: "text-purple-400",
      text: "text-purple-400",
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.purple;

  // Format value
  const formatValue = (val) => {
    if (val === null || val === undefined) return "0";

    const numValue = typeof val === "number" ? val : parseFloat(val) || 0;

    if (isCurrency) {
      return `KES ${numValue.toLocaleString()}`;
    }

    return numValue.toLocaleString();
  };

  return (
    <div
      className={`
        backdrop-blur-sm 
        bg-linear-to-br ${scheme.bg}
        border ${scheme.border}
        rounded-xl p-4 sm:p-6 
        shadow-lg
        ${highlight ? "ring-2 ring-green-500/30" : ""}
        hover:scale-105 transition-transform duration-200
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/10 ${scheme.icon}`}>
          {icon}
        </div>
      </div>

      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>

      <p className={`text-2xl sm:text-3xl font-bold ${scheme.text}`}>
        {formatValue(value)}
      </p>
    </div>
  );
};

export default KPICard;

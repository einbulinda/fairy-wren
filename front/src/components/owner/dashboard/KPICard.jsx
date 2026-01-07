import { formatCurrency } from "../../../utils/common";

const KPICard = ({ title, value, icon, color = "purple", highlight }) => {
  const colorClasses = {
    green: {
      gradient: "from-green-900/30 to-green-900/10",
      border: "border-green-500/20",
      shadow: "shadow-green-500/5",
      glow: "bg-green-500/10",
      icon: "text-green-400",
      text: "text-green-400",
    },
    blue: {
      gradient: "from-blue-900/30 to-blue-900/10",
      border: "border-blue-500/20",
      shadow: "shadow-blue-500/5",
      glow: "bg-blue-500/10",
      icon: "text-blue-400",
      text: "text-blue-400",
    },
    orange: {
      gradient: "from-orange-900/30 to-orange-900/10",
      border: "border-orange-500/20",
      shadow: "shadow-orange-500/5",
      glow: "bg-orange-500/10",
      icon: "text-orange-400",
      text: "text-orange-400",
    },
    purple: {
      gradient: "from-purple-900/30 to-purple-900/10",
      border: "border-purple-500/20",
      shadow: "shadow-purple-500/5",
      glow: "bg-purple-500/10",
      icon: "text-purple-400",
      text: "text-purple-400",
    },
    pink: {
      gradient: "from-pink-900/30 to-pink-900/10",
      border: "border-pink-500/20",
      shadow: "shadow-pink-500/5",
      glow: "bg-pink-500/10",
      icon: "text-pink-400",
      text: "text-pink-400",
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden
        bg-linear-to-br ${colors.gradient}
        backdrop-blur-md
        border ${colors.border}
        rounded-xl p-4 sm:p-5
        shadow-lg ${colors.shadow}
        hover:${colors.shadow.replace("/5", "/10")}
        transition-all duration-300
        ${highlight ? "ring-2 ring-green-500/30" : ""}
      `}
    >
      {/* Glow effect */}
      <div
        className={`absolute top-0 right-0 w-24 h-24 ${colors.glow} rounded-full blur-2xl transition-all duration-300`}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`p-2.5 rounded-lg bg-linear-to-br ${colors.gradient} border ${colors.border}`}
          >
            <div className={colors.icon}>{icon}</div>
          </div>
          {highlight && (
            <div className="px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30">
              <span className="text-xs font-semibold text-green-300">
                Primary
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">
          {typeof value === "number" ? formatCurrency(value) : value}
        </p>
      </div>
    </div>
  );
};

export default KPICard;

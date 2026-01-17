// VarianceBadge.jsx
export default function VarianceBadge({ value }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
        <svg
          className="w-4 h-4 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-green-300 font-semibold text-sm">Match</span>
      </div>
    );
  }

  const isPositive = value > 0;

  return (
    <div
      className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-lg
      ${
        isPositive
          ? "bg-green-500/20 border border-green-500/30"
          : "bg-red-500/20 border border-red-500/30"
      }
    `}
    >
      <svg
        className={`w-4 h-4 ${isPositive ? "text-green-400" : "text-red-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isPositive ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        )}
      </svg>
      <span
        className={`font-mono font-semibold text-sm ${
          isPositive ? "text-green-300" : "text-red-300"
        }`}
      >
        {isPositive ? `+${value}` : value}
      </span>
    </div>
  );
}

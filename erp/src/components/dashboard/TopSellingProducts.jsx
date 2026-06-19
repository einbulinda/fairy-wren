const fmtK = (v) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
};

const RANK_STYLES = [
  { num: "text-yellow-400", bar: "from-yellow-500 to-yellow-400" },
  { num: "text-surface-300", bar: "from-slate-400 to-slate-300" },
  { num: "text-orange-400",  bar: "from-orange-600 to-orange-400" },
];

const TopSellingProducts = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-surface-400">
        <p>No product data available</p>
      </div>
    );
  }

  const topItems = data.slice(0, 5);
  const maxSales = Math.max(...topItems.map((p) => Number(p.total_sales)));

  return (
    <div className="space-y-1">
      {topItems.map((product, index) => {
        const sales   = Number(product.total_sales);
        const pct     = maxSales > 0 ? (sales / maxSales) * 100 : 0;
        const style   = RANK_STYLES[index] ?? { num: "text-surface-500", bar: "from-primary-600 to-primary-400" };

        return (
          <div key={product.product_id || index} className="py-2 border-b border-surface-700/40 last:border-0">
            {/* Top row: rank + name + revenue */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold w-5 shrink-0 tabular-nums ${style.num}`}>
                #{index + 1}
              </span>
              <span className="text-sm text-white font-medium flex-1 truncate min-w-0">
                {product.product_name}
              </span>
              {/* Compact on mobile, full on sm+ */}
              <span className="text-sm font-bold text-white tabular-nums shrink-0 sm:hidden">
                KES {fmtK(sales)}
              </span>
              <span className="hidden sm:inline text-sm font-bold text-white tabular-nums shrink-0">
                {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(sales)}
              </span>
            </div>

            {/* Bottom row: category tag + bar + qty */}
            <div className="flex items-center gap-2 mt-1.5 pl-7">
              {/* Category — hidden on mobile to save space */}
              <span className="hidden sm:inline text-[10px] text-surface-500 shrink-0 max-w-24 truncate">
                {product.category_name}
              </span>
              <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-linear-to-r ${style.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-surface-500 shrink-0 tabular-nums">
                {product.total_quantity} sold
              </span>
            </div>

            {/* Mobile-only: category tag below bar */}
            {product.category_name && (
              <div className="sm:hidden pl-7 mt-0.5">
                <span className="text-[10px] text-surface-600">{product.category_name}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TopSellingProducts;

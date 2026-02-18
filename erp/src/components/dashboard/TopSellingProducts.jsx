const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

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
    <div className="space-y-3">
      {topItems.map((product, index) => {
        const sales = Number(product.total_sales);
        const percentage = maxSales > 0 ? (sales / maxSales) * 100 : 0;
        return (
          <div key={product.product_id || index} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-surface-500 w-5 shrink-0">#{index + 1}</span>
                <span className="text-sm text-white font-medium truncate">{product.product_name}</span>
                <span className="text-xs text-surface-500 shrink-0">{product.category_name}</span>
              </div>
              <span className="text-sm text-white font-semibold ml-3 shrink-0">{formatCurrency(sales)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-surface-500 w-16 text-right">{product.total_quantity} sold</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopSellingProducts;

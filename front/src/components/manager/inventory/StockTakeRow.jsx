import VarianceBadge from "./VarianceBadge";

const StockTakeRow = ({ product, value, onChange }) => {
  const systemQty = product.current_stock;
  const physicalQty = value === undefined ? systemQty : Number(value);
  const variance = physicalQty - systemQty;

  return (
    <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-gray-700">
      <div className="col-span-2">
        <p className="font-medium">{product.name}</p>
        <p className="text-sm text-gray-400">Unit: {product.unit}</p>
      </div>

      <div className="text-right font-mono">{systemQty}</div>

      <div>
        <input
          type="number"
          className="w-full px-2 py-1 bg-gray-800 rounded"
          value={physicalQty}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="text-right">
        <VarianceBadge value={variance} />
      </div>
    </div>
  );
};

export default StockTakeRow;

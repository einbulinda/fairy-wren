import { useState, useMemo } from "react";
import { ArrowRight, Repeat, History, Package, AlertTriangle, Loader2, TrendingDown } from "lucide-react";
import {
  useConvertibleProducts,
  useConversionHistory,
  useTotSize,
  useExecuteConversion,
} from "@/hooks/useInventory";
import { inputCls } from "@/utils/constants";
import { formatCurrency, fmtDate } from "@/utils/formatters";

const ConversionTab = () => {
  const { data: products = [], isLoading: loadingProducts } = useConvertibleProducts();
  const { data: history = [], isLoading: loadingHistory } = useConversionHistory();
  const { data: totConfig } = useTotSize();
  const convertMutation = useExecuteConversion();

  const totSize = totConfig?.default_tot_size_ml ?? 30;

  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [sourceQty, setSourceQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState("convert"); // convert | history

  const sourceProduct = products.find((p) => p.id === sourceId);
  const targetProduct = products.find((p) => p.id === targetId);

  // Auto-calculate target qty based on volumes
  const calculatedTargetQty = useMemo(() => {
    if (!sourceProduct?.volume_ml || !targetProduct?.volume_ml || !sourceQty) return "";
    const totalMl = Number(sourceQty) * sourceProduct.volume_ml;
    return Math.floor(totalMl / targetProduct.volume_ml);
  }, [sourceProduct, targetProduct, sourceQty]);

  // Cost price breakdown preview
  const costPreview = useMemo(() => {
    if (
      !sourceProduct?.cost_price || !sourceProduct?.volume_ml ||
      !targetProduct?.volume_ml || !calculatedTargetQty
    ) return null;

    const newUnitCost = sourceProduct.cost_price * targetProduct.volume_ml / sourceProduct.volume_ml;
    const existingStock = targetProduct.current_stock ?? 0;
    const existingCost = targetProduct.cost_price ?? 0;

    let finalCost;
    let isWeighted = false;

    if (existingStock > 0 && existingCost > 0) {
      finalCost = (existingStock * existingCost + calculatedTargetQty * newUnitCost) / (existingStock + calculatedTargetQty);
      isWeighted = true;
    } else {
      finalCost = newUnitCost;
    }

    return { newUnitCost, finalCost, isWeighted, existingStock, existingCost };
  }, [sourceProduct, targetProduct, calculatedTargetQty]);

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!sourceId || !targetId || !sourceQty || !calculatedTargetQty) return;

    await convertMutation.mutateAsync({
      source_product_id: sourceId,
      target_product_id: targetId,
      source_qty: Number(sourceQty),
      target_qty: calculatedTargetQty,
      notes: notes || null,
    });

    // Reset form
    setSourceQty("1");
    setNotes("");
  };

  // Filter target products: only show products with smaller volume than source
  const targetOptions = useMemo(() => {
    if (!sourceProduct) return products;
    return products.filter(
      (p) => p.id !== sourceId && p.volume_ml < sourceProduct.volume_ml,
    );
  }, [products, sourceId, sourceProduct]);

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("convert")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "convert"
              ? "bg-primary-600 text-white"
              : "text-surface-400 hover:text-white hover:bg-surface-700"
          }`}
        >
          <Repeat size={14} /> Convert
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-primary-600 text-white"
              : "text-surface-400 hover:text-white hover:bg-surface-700"
          }`}
        >
          <History size={14} /> History
        </button>
      </div>

      {tab === "convert" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversion Form */}
          <div className="lg:col-span-2 bg-surface-800 rounded-xl border border-surface-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Product Conversion</h3>
            <p className="text-xs text-surface-500 mb-4">
              Convert bulk items into smaller units (e.g. bottle → tots). Only products with volume set are shown.
            </p>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12 text-surface-400">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading products…
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package size={32} className="mx-auto mb-3 text-surface-600" />
                <p className="text-sm text-surface-400">No products with volume configured</p>
                <p className="text-xs text-surface-500 mt-1">
                  Set the volume (ml) on products to enable conversions
                </p>
              </div>
            ) : (
              <form onSubmit={handleConvert} className="space-y-4">
                {/* Source */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Source Product (deduct from)</label>
                  <select
                    value={sourceId}
                    onChange={(e) => {
                      setSourceId(e.target.value);
                      setTargetId("");
                    }}
                    className={inputCls}
                    required
                  >
                    <option value="">Select source product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.volume_ml}ml ({p.unit}) · Stock: {p.current_stock}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">
                    Source Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={sourceProduct?.current_stock || 9999}
                    value={sourceQty}
                    onChange={(e) => setSourceQty(e.target.value)}
                    className={inputCls}
                    required
                  />
                  {sourceProduct && (
                    <p className="text-xs text-surface-500 mt-1">
                      Available: {sourceProduct.current_stock} {sourceProduct.unit}(s)
                      {sourceQty && sourceProduct.volume_ml
                        ? ` · Total: ${Number(sourceQty) * sourceProduct.volume_ml}ml`
                        : ""}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight size={20} className="text-primary-400" />
                </div>

                {/* Target */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Target Product (add to)</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className={inputCls}
                    required
                    disabled={!sourceId}
                  >
                    <option value="">Select target product…</option>
                    {targetOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.volume_ml}ml ({p.unit}) · Stock: {p.current_stock}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calculated output */}
                {calculatedTargetQty > 0 && (
                  <div className="space-y-3">
                    <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                      <p className="text-xs text-surface-400 mb-1">Conversion Result</p>
                      <p className="text-lg font-bold text-white">
                        {sourceQty} × {sourceProduct?.name}{" "}
                        <span className="text-primary-400">→</span>{" "}
                        {calculatedTargetQty} × {targetProduct?.name}
                      </p>
                      <p className="text-xs text-surface-500 mt-1">
                        {Number(sourceQty) * sourceProduct.volume_ml}ml ÷ {targetProduct.volume_ml}ml = {calculatedTargetQty} units
                      </p>
                    </div>

                    {costPreview && (
                      <div className="bg-surface-900/60 border border-surface-600 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown size={13} className="text-emerald-400" />
                          <p className="text-xs font-medium text-surface-300">Cost Price Breakdown</p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <span className="text-surface-500">Source cost price</span>
                          <span className="text-surface-300 tabular-nums text-right">
                            {formatCurrency(sourceProduct.cost_price)} / {sourceProduct.unit}
                          </span>

                          <span className="text-surface-500">Volume ratio</span>
                          <span className="text-surface-300 tabular-nums text-right">
                            {targetProduct.volume_ml}ml ÷ {sourceProduct.volume_ml}ml
                          </span>

                          <span className="text-surface-500">New cost / {targetProduct.unit}</span>
                          <span className="text-emerald-400 tabular-nums font-medium text-right">
                            {formatCurrency(costPreview.newUnitCost)}
                          </span>
                        </div>

                        {costPreview.isWeighted && (
                          <>
                            <div className="border-t border-surface-700 pt-2 mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <span className="text-surface-500">Existing stock</span>
                              <span className="text-surface-300 tabular-nums text-right">
                                {costPreview.existingStock} × {formatCurrency(costPreview.existingCost)}
                              </span>
                              <span className="text-surface-500">Adding</span>
                              <span className="text-surface-300 tabular-nums text-right">
                                {calculatedTargetQty} × {formatCurrency(costPreview.newUnitCost)}
                              </span>
                            </div>
                            <div className="border-t border-surface-700 pt-2 flex justify-between text-xs">
                              <span className="text-surface-400 font-medium">Weighted avg cost</span>
                              <span className="text-emerald-400 font-bold tabular-nums">
                                {formatCurrency(costPreview.finalCost)}
                              </span>
                            </div>
                          </>
                        )}

                        {!costPreview.isWeighted && (
                          <p className="text-xs text-surface-500 pt-1 border-t border-surface-700">
                            No existing {targetProduct.name} stock — new cost takes effect directly.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Insufficient stock warning */}
                {sourceProduct && Number(sourceQty) > sourceProduct.current_stock && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertTriangle size={14} />
                    Insufficient stock. Available: {sourceProduct.current_stock}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. For weekend service"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    convertMutation.isPending ||
                    !sourceId ||
                    !targetId ||
                    !calculatedTargetQty ||
                    Number(sourceQty) > (sourceProduct?.current_stock || 0)
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                >
                  {convertMutation.isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Converting…</>
                  ) : (
                    <><Repeat size={16} /> Execute Conversion</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Info card */}
          <div className="space-y-4">
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h4 className="text-sm font-semibold text-white mb-2">How it works</h4>
              <ul className="space-y-2 text-xs text-surface-400">
                <li className="flex items-start gap-2">
                  <span className="bg-primary-500/20 text-primary-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</span>
                  Select the bulk product to break down (e.g. 750ml whisky bottle)
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary-500/20 text-primary-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</span>
                  Select the target unit product (e.g. whisky tot)
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary-500/20 text-primary-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</span>
                  Quantity is auto-calculated from volumes
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary-500/20 text-primary-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">4</span>
                  Stock is deducted from source and added to target atomically
                </li>
              </ul>
            </div>

            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Tot Size</h4>
              <p className="text-xs text-surface-400">
                Current setting: <span className="text-white font-medium">{totSize}ml</span>
              </p>
              <p className="text-xs text-surface-500 mt-1">
                Change this in Settings → Inventory Policies
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center" />
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">By</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {loadingHistory ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-400">
                    Loading…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-400">
                    No conversions yet
                  </td>
                </tr>
              ) : (
                history.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-700/50 transition-colors">
                    <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                      {fmtDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white">{c.source?.name}</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">-{c.source_qty}</td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight size={14} className="text-surface-500 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-white">{c.target?.name}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-mono">+{c.target_qty}</td>
                    <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                      {c.creator?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-surface-500 hidden lg:table-cell truncate max-w-[200px]">
                      {c.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ConversionTab;

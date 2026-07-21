import { useState } from "react";
import { X, ArrowUpRight, ArrowDownLeft, Plus, Trash2, Building2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateExchange, usePartners } from "@/hooks/useExchanges";
import { useStockItems } from "@/hooks/useInventory";
import { inputCls } from "./inventoryUtils";
import { localDateStr } from "@/utils/formatters";
import ProductSearchModal from "./ProductSearchModal";
import QuickAddPartnerModal from "./QuickAddPartnerModal";

const ExchangeFormModal = ({ onClose, onSuccess }) => {
  const { data: partners = [] } = usePartners();
  const { data: stockItems = [] } = useStockItems();
  const createMutation = useCreateExchange();

  const [form, setForm] = useState({
    partner_id: "",
    direction: "outbound",
    exchange_date: localDateStr(),
    notes: "",
  });
  const [lines, setLines] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const addLine = (product) => {
    setLines((prev) => [
      ...prev,
      { product_id: product.id, product_name: product.name, quantity: 1 },
    ]);
    setShowProductModal(false);
  };

  const updateQty = (idx, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: parseInt(value) || 0 };
      return updated;
    });
  };

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partner_id) {
      toast.error("Select a business partner");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    if (lines.some((l) => !l.quantity || l.quantity <= 0)) {
      toast.error("All quantities must be > 0");
      return;
    }

    try {
      await createMutation.mutateAsync({
        partner_id: form.partner_id,
        direction: form.direction,
        exchange_date: form.exchange_date,
        notes: form.notes || null,
        line_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      });
      onSuccess?.();
      onClose();
    } catch {
      // error handled by mutation
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700 shrink-0">
            <h3 className="text-white font-semibold text-sm">New Product Exchange</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
            {/* Direction toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "outbound" })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  form.direction === "outbound"
                    ? "bg-primary-600 border-primary-600 text-white"
                    : "bg-surface-900 border-surface-700 text-surface-400 hover:text-white"
                }`}
              >
                <ArrowUpRight size={14} /> Outbound (they borrow)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "inbound" })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  form.direction === "inbound"
                    ? "bg-primary-600 border-primary-600 text-white"
                    : "bg-surface-900 border-surface-700 text-surface-400 hover:text-white"
                }`}
              >
                <ArrowDownLeft size={14} /> Inbound (returned to us)
              </button>
            </div>

            {/* Partner + date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Business Partner *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <select
                      value={form.partner_id}
                      onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                      className={inputCls + " pl-8"}
                      required
                    >
                      <option value="">Select…</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPartnerModal(true)}
                    className="px-2.5 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white text-sm transition-colors shrink-0"
                    title="Add new business partner"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.exchange_date}
                  onChange={(e) => setForm({ ...form, exchange_date: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-surface-400">Products ({lines.length})</label>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-500 rounded-lg text-white transition-colors"
                >
                  <Plus size={12} /> Add Product
                </button>
              </div>

              {lines.length === 0 ? (
                <p className="text-center py-4 text-surface-500 text-xs bg-surface-900 rounded-lg border border-surface-700">
                  No products added yet
                </p>
              ) : (
                <div className="space-y-1.5">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-900 border border-surface-700 rounded-lg p-2">
                      <span className="flex-1 text-white text-sm truncate">{line.product_name}</span>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateQty(idx, e.target.value)}
                        className="w-20 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-surface-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className={inputCls + " resize-none"}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-700">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-surface-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || lines.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
              >
                <Save size={14} />
                {createMutation.isPending ? "Saving…" : "Save Exchange"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showProductModal && (
        <ProductSearchModal
          products={stockItems}
          lines={lines}
          onSelect={addLine}
          onClose={() => setShowProductModal(false)}
          onProductCreated={() => {}}
        />
      )}

      {showPartnerModal && (
        <QuickAddPartnerModal
          onCreated={(partner) => {
            setForm((prev) => ({ ...prev, partner_id: partner.id }));
          }}
          onClose={() => setShowPartnerModal(false)}
        />
      )}
    </>
  );
};

export default ExchangeFormModal;

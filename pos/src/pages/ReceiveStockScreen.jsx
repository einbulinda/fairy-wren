import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Trash2,
  Search,
  Save,
  X,
  Building2,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { inventoryService } from "../services/inventory.service";
import api from "@/api";

const localDateStr = () => new Date().toLocaleDateString("en-CA");

export default function ReceiveStockScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplier_id: "",
    invoice_number: "",
    purchase_date: localDateStr(),
  });
  const [lines, setLines] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    api.get("/suppliers").then((res) => {
      const data = res.data?.data ?? res.data ?? [];
      setSuppliers([...data].sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(console.error);

    api.get("/inventory/items").then((res) => {
      setProducts(res.data?.data ?? res.data ?? []);
    }).catch(console.error);
  }, []);

  const filteredProducts = searchQ
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQ.toLowerCase()) &&
        !lines.some((l) => l.product_id === p.id),
      )
    : products.filter((p) => !lines.some((l) => l.product_id === p.id));

  const addProduct = (product) => {
    const unit_cost = Number(product.cost_price) || 0;
    setLines((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        total_price: unit_cost,
        unit_cost,
      },
    ]);
    setSearchQ("");
    setShowSearch(false);
  };

  const updateLine = useCallback((idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[idx] };
      if (field === "quantity") line.quantity = parseInt(value) || 0;
      if (field === "total_price") line.total_price = parseFloat(value) || 0;
      line.unit_cost =
        line.quantity > 0
          ? parseFloat((line.total_price / line.quantity).toFixed(2))
          : 0;
      updated[idx] = line;
      return updated;
    });
  }, []);

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const total = lines.reduce((s, l) => s + (l.total_price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) { toast.error("Select a supplier"); return; }
    if (!form.invoice_number.trim()) { toast.error("Enter invoice number"); return; }
    if (lines.length === 0) { toast.error("Add at least one product"); return; }
    if (lines.some((l) => !l.quantity || l.quantity <= 0)) { toast.error("All quantities must be > 0"); return; }
    if (lines.some((l) => !l.total_price || l.total_price <= 0)) { toast.error("All total prices must be > 0"); return; }

    setSubmitting(true);
    try {
      const result = await inventoryService.receiveStock({
        ...form,
        line_items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          line_total: l.total_price,
        })),
        total_amount: total,
      });
      setSubmitResult(result?.data ?? result);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to submit receipt");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({ supplier_id: "", invoice_number: "", purchase_date: localDateStr() });
    setLines([]);
    setSubmitted(false);
    setSubmitResult(null);
  };

  const isApproved = submitResult?.approval_status === "approved";

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <div className={`rounded-full p-5 ${isApproved ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
          <CheckCircle size={48} className={isApproved ? "text-green-400" : "text-yellow-400"} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isApproved ? "Stock Received" : "Receipt Submitted"}
          </h2>
          <p className="text-gray-400 text-sm max-w-xs">
            {isApproved
              ? "Inventory has been updated immediately."
              : "Your goods receipt has been submitted and is pending approval. Stock levels will be updated once an approver reviews it."}
          </p>
        </div>
        <button
          onClick={reset}
          className={`px-6 py-2.5 font-semibold rounded-xl transition-colors ${isApproved ? "bg-green-600 hover:bg-green-500 text-white" : "bg-yellow-500 hover:bg-yellow-400 text-black"}`}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto pb-8">
      <div className="flex items-center gap-2 mb-5">
        <Truck size={20} className="text-yellow-400" />
        <h1 className="text-lg font-bold text-white">Receive Stock</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Purchase details */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Supplier *</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                required
                className="w-full pl-8 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Invoice No. *</label>
              <input
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                placeholder="INV-001"
                required
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Date *</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 rounded-t-xl">
            <span className="text-sm font-semibold text-white">
              Items ({lines.length})
            </span>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">
              Tap <strong>Add</strong> to add products
            </p>
          ) : (
            <div className="divide-y divide-gray-700/60 overflow-hidden rounded-b-xl">
              {lines.map((line, idx) => (
                <div key={idx} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-medium flex-1 min-w-0 truncate">{line.product_name}</p>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="shrink-0 p-2 -m-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                        className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Total Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.total_price}
                        onChange={(e) => updateLine(idx, "total_price", e.target.value)}
                        className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-700/50">
                    <span>Unit cost</span>
                    <span className="font-mono text-yellow-400 font-medium">
                      KSh {Number(line.unit_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center justify-between font-semibold text-sm">
                <span className="text-gray-400">{lines.length} product{lines.length !== 1 ? "s" : ""}</span>
                <span className="font-mono text-white">KSh {total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || lines.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors"
        >
          <Save size={16} />
          {submitting ? "Submitting…" : "Submit for Approval"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Submitted receipts require approval before stock is updated.
        </p>
      </form>

      {/* Product search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-gray-700">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products…"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQ(""); }}
                className="shrink-0 p-2 -m-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredProducts.slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 text-left transition-colors border-b border-gray-700/50 last:border-0"
                >
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-gray-500 text-xs font-mono ml-2 shrink-0">
                    {p.current_stock ?? 0} in stock
                  </span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">No products found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

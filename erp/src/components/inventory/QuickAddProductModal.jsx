import { useState } from "react";
import { X, Package } from "lucide-react";
import { useCreateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { inputCls } from "./inventoryUtils";

const UNITS = ["bottle", "can", "glass", "tot", "packet"];

const EMPTY = {
  name: "",
  price: "",
  cost_price: "",
  category_id: "",
  unit: "bottle",
  track_inventory: true,
};

const QuickAddProductModal = ({ onCreated, onClose }) => {
  const [form, setForm] = useState(EMPTY);
  const createMutation = useCreateProduct();
  const { data: categories = [] } = useCategories();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.category_id) return;

    try {
      const created = await createMutation.mutateAsync({
        name: form.name.trim(),
        price: parseFloat(form.price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        category_id: form.category_id,
        unit: form.unit,
        track_inventory: form.track_inventory,
      });
      onCreated(created);
      onClose();
    } catch {
      // error handled by mutation
    }
  };

  const set = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-full max-w-sm mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Package size={16} className="text-primary-400" />
            New Product
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Product name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Selling Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className={inputCls}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Cost Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => set("cost_price", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Category *</label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                className={inputCls}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.track_inventory}
                  onChange={(e) => set("track_inventory", e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-900 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs text-surface-400">Track Inventory</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-surface-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !form.name.trim() || !form.price || !form.category_id}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddProductModal;

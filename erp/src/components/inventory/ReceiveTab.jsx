import { useState, useEffect } from "react";
import {
  Package,
  Truck,
  Plus,
  Trash2,
  FileText,
  Calendar,
  Save,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useReceiveInventory, useStockItems } from "@/hooks/useInventory";
import { fetchSuppliers } from "@/services/suppliers.service";
import { inputCls } from "./inventoryUtils";
import ProductSearchModal from "./ProductSearchModal";
import QuickAddSupplierModal from "./QuickAddSupplierModal";

const ReceiveTab = ({ onSuccess, supplierId, supplierName }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplier_id: supplierId || "",
    invoice_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });
  const [lines, setLines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const receiveMutation = useReceiveInventory();
  const { data: stockItems = [] } = useStockItems();

  useEffect(() => {
    if (!supplierId) {
      fetchSuppliers().then(setSuppliers).catch(console.error);
    }
  }, [supplierId]);

  useEffect(() => {
    setProducts(stockItems);
  }, [stockItems]);

  const addLine = (product) => {
    setLines([
      ...lines,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_cost: product.cost_price || 0,
      },
    ]);
    setShowModal(false);
  };

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    updated[idx] = {
      ...updated[idx],
      [field]:
        field === "quantity" ? parseInt(value) || 0 : parseFloat(value) || 0,
    };
    setLines(updated);
  };

  const total = lines.reduce(
    (s, l) => s + (l.quantity || 0) * (l.unit_cost || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) {
      toast.error("Select a supplier");
      return;
    }
    if (!form.invoice_number.trim()) {
      toast.error("Enter invoice number");
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
      await receiveMutation.mutateAsync({
        ...form,
        line_items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          line_total: l.quantity * l.unit_cost,
        })),
        total_amount: total,
      });
      setForm({
        supplier_id: supplierId || "",
        invoice_number: "",
        purchase_date: new Date().toISOString().split("T")[0],
      });
      setLines([]);
      onSuccess?.();
    } catch {
      // error handled by mutation
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck size={18} className="text-primary-400" />
            Receive Inventory
          </h2>
        </div>

        {/* Purchase details */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText size={16} /> Purchase Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">
                Supplier *
              </label>
              {supplierId ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-700/50 border border-surface-600 rounded-lg text-white text-sm">
                  <Building2 size={14} className="text-surface-400" />
                  {supplierName}
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                    />
                    <select
                      value={form.supplier_id}
                      onChange={(e) =>
                        setForm({ ...form, supplier_id: e.target.value })
                      }
                      className={inputCls + " pl-8"}
                      required
                    >
                      <option value="">Select…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="px-2.5 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white text-sm transition-colors shrink-0"
                    title="Add new supplier"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">
                Invoice Number *
              </label>
              <input
                value={form.invoice_number}
                onChange={(e) =>
                  setForm({ ...form, invoice_number: e.target.value })
                }
                className={inputCls}
                placeholder="INV-001"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">
                Purchase Date *
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                />
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) =>
                    setForm({ ...form, purchase_date: e.target.value })
                  }
                  className={inputCls + " pl-8"}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Package size={16} /> Items ({lines.length})
          </h3>

          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-surface-400 uppercase bg-surface-900">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right w-24">Qty</th>
                    <th className="px-3 py-2 text-right w-28">Unit Cost</th>
                    <th className="px-3 py-2 text-right w-28">Total</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-white">
                        {line.product_name}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, "quantity", e.target.value)
                          }
                          className="w-20 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ml-auto block"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unit_cost}
                          onChange={(e) =>
                            updateLine(idx, "unit_cost", e.target.value)
                          }
                          className="w-24 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 ml-auto block"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-primary-400">
                        KSh {(line.quantity * line.unit_cost).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setLines(lines.filter((_, i) => i !== idx))
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-900 font-semibold">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-surface-400 text-sm"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-white">
                      KSh {total.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-center py-6 text-surface-400 text-sm">
              No items added yet — click <strong>Add Product</strong> above
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={14} /> Add Product
          </button>
          <button
            type="submit"
            disabled={receiveMutation.isPending || lines.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            <Save size={16} />
            {receiveMutation.isPending ? "Saving…" : "Save Invoice"}
          </button>
        </div>
      </form>

      {showModal && (
        <ProductSearchModal
          products={products}
          lines={lines}
          onSelect={addLine}
          onClose={() => setShowModal(false)}
          onProductCreated={(product) => {
            setProducts((prev) => [...prev, { ...product, current_stock: 0 }]);
          }}
        />
      )}

      {showSupplierModal && (
        <QuickAddSupplierModal
          onCreated={(supplier) => {
            setSuppliers((prev) => [...prev, supplier]);
            setForm((prev) => ({ ...prev, supplier_id: supplier.id }));
          }}
          onClose={() => setShowSupplierModal(false)}
        />
      )}
    </>
  );
};

export default ReceiveTab;

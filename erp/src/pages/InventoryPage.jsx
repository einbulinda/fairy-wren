import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Truck,
  ClipboardCheck,
  BarChart2,
  Search,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  Calendar,
  Save,
  X,
  Building2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStockItems, useReceiveInventory, useStockTakeReports, useApproveStockTake, useRejectStockTake } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { fetchSuppliers } from "@/services/suppliers.service";
import { useEffect } from "react";

const TAB_STOCK    = "stock";
const TAB_RECEIVE  = "receive";
const TAB_REPORTS  = "reports";
const TAB_APPROVALS = "approvals";

const inputCls = "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

// ─── Stock Levels Tab ────────────────────────────────────────────────────────

const StockTab = ({ items, isLoading, onRefresh }) => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name?.toLowerCase().includes(q));
  }, [items, search]);

  const low = items.filter((i) => i.current_stock > 0 && i.current_stock <= 5).length;
  const out = items.filter((i) => i.current_stock === 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total SKUs", value: items.length, color: "primary" },
          { label: "Low Stock (≤5)", value: low, color: "yellow" },
          { label: "Out of Stock", value: out, color: "red" },
          {
            label: "Total Value",
            value: `KSh ${items.reduce((s, i) => s + (i.cost_price || 0) * i.current_stock, 0).toLocaleString()}`,
            color: "green",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-800 rounded-xl p-4 border border-surface-700">
            <p className="text-surface-400 text-xs mb-1">{stat.label}</p>
            <p className={`text-xl font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Alert */}
      {(low > 0 || out > 0) && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {out > 0 && <strong>{out} items out of stock. </strong>}
            {low > 0 && <span>{low} items running low.</span>}
          </span>
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className={inputCls + " pl-9"} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="px-3 py-2 bg-surface-700 rounded-lg hover:bg-surface-600 text-surface-300 transition-colors">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Cost Price</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">No items found</td></tr>
            ) : filtered.map((item) => {
              const stockStatus = item.current_stock === 0 ? "out" : item.current_stock <= 5 ? "low" : "ok";
              return (
                <tr key={item.id} className="hover:bg-surface-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-surface-400 text-xs">{item.category_name || item.categories?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">{item.current_stock}</td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">KSh {(item.cost_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">KSh {((item.cost_price || 0) * item.current_stock).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      stockStatus === "out" ? "bg-red-500/20 text-red-400" :
                      stockStatus === "low" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>
                      {stockStatus === "out" ? "Out of Stock" : stockStatus === "low" ? "Low" : "In Stock"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Receive Inventory Tab ────────────────────────────────────────────────────

const ReceiveTab = ({ onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ supplier_id: "", invoice_number: "", purchase_date: new Date().toISOString().split("T")[0] });
  const [lines, setLines] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const receiveMutation = useReceiveInventory();
  const { data: stockItems = [] } = useStockItems();

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  useEffect(() => {
    setProducts(stockItems);
  }, [stockItems]);

  const filtered = useMemo(() =>
    products.filter((p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !lines.find((l) => l.product_id === p.id)
    ), [products, productSearch, lines]);

  const addLine = (product) => {
    setLines([...lines, { product_id: product.id, product_name: product.name, quantity: 1, unit_cost: product.cost_price || 0 }]);
    setProductSearch("");
    setShowSearch(false);
  };

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: field === "quantity" ? parseInt(value) || 0 : parseFloat(value) || 0 };
    setLines(updated);
  };

  const total = lines.reduce((s, l) => s + (l.quantity || 0) * (l.unit_cost || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) { toast.error("Select a supplier"); return; }
    if (!form.invoice_number.trim()) { toast.error("Enter invoice number"); return; }
    if (lines.length === 0) { toast.error("Add at least one product"); return; }
    if (lines.some((l) => !l.quantity || l.quantity <= 0)) { toast.error("All quantities must be > 0"); return; }

    try {
      await receiveMutation.mutateAsync({
        ...form,
        line_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_cost: l.unit_cost, line_total: l.quantity * l.unit_cost })),
        total_amount: total,
      });
      setForm({ supplier_id: "", invoice_number: "", purchase_date: new Date().toISOString().split("T")[0] });
      setLines([]);
      onSuccess?.();
    } catch {
      // error handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {/* Header fields */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><FileText size={16} /> Purchase Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Supplier *</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className={inputCls + " pl-8"} required>
                <option value="">Select…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Invoice Number *</label>
            <input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className={inputCls} placeholder="INV-001" required />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Purchase Date *</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className={inputCls + " pl-8"} required />
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2"><Package size={16} /> Items ({lines.length})</h3>
          <button type="button" onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors">
            <Plus size={14} /> Add Product
          </button>
        </div>

        {showSearch && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className={inputCls + " pl-8"} placeholder="Search products…" />
            {productSearch && (
              <div className="absolute z-10 w-full mt-1 bg-surface-900 border border-surface-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-surface-400 text-sm">No products found</p>
                ) : filtered.map((p) => (
                  <button key={p.id} type="button" onClick={() => addLine(p)} className="w-full px-4 py-2.5 text-left hover:bg-surface-700 text-sm border-b border-surface-700 last:border-0">
                    <span className="text-white">{p.name}</span>
                    <span className="text-surface-400 ml-2 text-xs">Stock: {p.current_stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                    <td className="px-3 py-2 text-white">{line.product_name}</td>
                    <td className="px-3 py-2">
                      <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} className="w-20 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ml-auto block" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0" value={line.unit_cost} onChange={(e) => updateLine(idx, "unit_cost", e.target.value)} className="w-24 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 ml-auto block" />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary-400">KSh {(line.quantity * line.unit_cost).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-900 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-surface-400 text-sm">Total</td>
                  <td className="px-3 py-2 text-right font-mono text-white">KSh {total.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-surface-400 text-sm">No items added yet</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={receiveMutation.isPending || lines.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors">
          <Save size={16} />
          {receiveMutation.isPending ? "Saving…" : "Receive Inventory"}
        </button>
      </div>
    </form>
  );
};

// ─── Reports Tab ──────────────────────────────────────────────────────────────

const ReportsTab = () => {
  const { data: reports = [], isLoading } = useStockTakeReports();

  if (isLoading) return <p className="text-surface-400 text-sm py-4">Loading…</p>;

  if (reports.length === 0)
    return <p className="text-surface-400 text-sm py-4">No stock take reports yet.</p>;

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-white">{new Date(r.completed_at || r.created_at).toLocaleDateString()}</p>
              <p className="text-xs text-surface-400">By {r.completed_by_name || r.profiles?.name || "—"}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              r.status === "approved" ? "bg-green-500/20 text-green-400" :
              r.status === "rejected" ? "bg-red-500/20 text-red-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>{r.status}</span>
          </div>
          {r.items && (
            <div className="text-xs text-surface-400 flex gap-4">
              <span>{r.items.length} items counted</span>
              <span>{r.items.filter((i) => i.variance !== 0).length} variances</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Approvals Tab ────────────────────────────────────────────────────────────

const ApprovalsTab = () => {
  const { data: adjustments = [], isLoading, refetch } = useStockTakeReports();
  const approveMutation = useApproveStockTake();
  const rejectMutation = useRejectStockTake();

  const pending = (adjustments || []).filter((r) => r.status === "completed" || r.status === "pending_approval");

  if (isLoading) return <p className="text-surface-400 text-sm py-4">Loading…</p>;
  if (pending.length === 0) return <p className="text-surface-400 text-sm py-4">No stock takes pending approval.</p>;

  return (
    <div className="space-y-3">
      {pending.map((session) => (
        <div key={session.id} className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">Stock Take — {new Date(session.created_at).toLocaleDateString()}</p>
              <p className="text-xs text-surface-400">{session.items?.length || 0} items counted</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approveMutation.mutate(session.id, { onSuccess: refetch })}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button
                onClick={() => rejectMutation.mutate(session.id, { onSuccess: refetch })}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: TAB_STOCK,     label: "Stock Levels",     icon: Package },
  { id: TAB_RECEIVE,   label: "Receive Inventory", icon: Truck },
  { id: TAB_REPORTS,   label: "Reports",           icon: BarChart2 },
  { id: TAB_APPROVALS, label: "Approvals",         icon: ClipboardCheck },
];

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState(TAB_STOCK);
  const { data: stockItems = [], isLoading, refetch } = useStockItems();

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === id ? "text-primary-400" : "text-surface-400 hover:text-surface-200"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {activeTab === TAB_STOCK && (
        <StockTab items={stockItems} isLoading={isLoading} onRefresh={refetch} />
      )}
      {activeTab === TAB_RECEIVE && (
        <ReceiveTab onSuccess={() => setActiveTab(TAB_STOCK)} />
      )}
      {activeTab === TAB_REPORTS && <ReportsTab />}
      {activeTab === TAB_APPROVALS && <ApprovalsTab />}
    </div>
  );
};

export default InventoryPage;

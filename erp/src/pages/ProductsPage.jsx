import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Package,
} from "lucide-react";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useUpdateProductStatus,
} from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import CategoriesTab from "@/components/products/CategoriesTab";

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const UNITS = ["bottle", "can", "glass", "tot", "packet"];

const EMPTY_PRODUCT = {
  name: "",
  price: "",
  cost_price: "",
  category_id: "",
  unit: "bottle",
  track_inventory: true,
};

// ─── Products Tab ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp size={12} className="text-primary-400" />
    : <ArrowDown size={12} className="text-primary-400" />;
};

const ProductsTab = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const statusMutation = useUpdateProductStatus();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (!showInactive) list = list.filter((p) => p.active);
    if (filterCategory) list = list.filter((p) => p.category_id === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortField) {
        case "name":     return dir * a.name.localeCompare(b.name);
        case "category": return dir * (a.category_name || a.categories?.name || "").localeCompare(b.category_name || b.categories?.name || "");
        case "price":    return dir * ((a.price ?? 0) - (b.price ?? 0));
        case "cost":     return dir * ((a.cost_price ?? 0) - (b.cost_price ?? 0));
        case "stock":    return dir * ((a.current_stock ?? 0) - (b.current_stock ?? 0));
        default:         return 0;
      }
    });

    return list;
  }, [products, search, filterCategory, showInactive, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_PRODUCT);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      price: p.price,
      cost_price: p.cost_price || "",
      category_id: p.category_id,
      unit: p.unit || "bottle",
      track_inventory: p.track_inventory ?? true,
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch {
      // handled by mutation
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className={inputCls + " pl-9"} placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className={inputCls + " sm:w-44"}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer whitespace-nowrap self-center">
          <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }} className="rounded" />
          Show inactive
        </label>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap">
          <Plus size={15} /> New Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">
                <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-white transition-colors">Product <SortIcon field="name" sortField={sortField} sortDir={sortDir} /></button>
              </th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">
                <button onClick={() => handleSort("category")} className="flex items-center gap-1 hover:text-white transition-colors">Category <SortIcon field="category" sortField={sortField} sortDir={sortDir} /></button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => handleSort("price")} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} /></button>
              </th>
              <th className="px-4 py-3 text-right hidden md:table-cell">
                <button onClick={() => handleSort("cost")} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">Cost <SortIcon field="cost" sortField={sortField} sortDir={sortDir} /></button>
              </th>
              <th className="px-4 py-3 text-right hidden md:table-cell">
                <button onClick={() => handleSort("stock")} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">Stock <SortIcon field="stock" sortField={sortField} sortDir={sortDir} /></button>
              </th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-400">No products found</td></tr>
            ) : paginated.map((p) => (
              <tr key={p.id} className="hover:bg-surface-700/50 transition-colors">
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/products/${p.id}`)} className="text-left group">
                    <p className="font-medium text-white group-hover:text-primary-400 transition-colors">{p.name}</p>
                    <p className="text-xs text-surface-400">{p.unit}</p>
                  </button>
                </td>
                <td className="px-4 py-3 text-surface-300 hidden sm:table-cell">{p.category_name || p.categories?.name}</td>
                <td className="px-4 py-3 text-right font-mono text-white">KSh {Number(p.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-surface-300 hidden md:table-cell">
                  {p.cost_price ? `KSh ${Number(p.cost_price).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-surface-300 hidden md:table-cell">{p.current_stock ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => statusMutation.mutate({ id: p.id, status: !p.active })} title="Toggle status">
                    {p.active
                      ? <ToggleRight size={20} className="text-green-400 mx-auto" />
                      : <ToggleLeft size={20} className="text-surface-500 mx-auto" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-surface-600 rounded text-surface-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => navigate(`/products/${p.id}`)} className="p-1.5 hover:bg-surface-600 rounded text-surface-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-400">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      page === n
                        ? "bg-primary-600 text-white"
                        : "hover:bg-surface-700 text-surface-300"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Form panel */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-surface-800 border-l border-surface-700 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-surface-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">{editTarget ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setFormOpen(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Selling Price *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Cost Price</label>
                  <input type="number" step="0.01" min="0" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className={inputCls} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Category *</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls} required>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
                <input type="checkbox" checked={form.track_inventory} onChange={(e) => setForm({ ...form, track_inventory: e.target.checked })} className="rounded" />
                Track inventory
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm text-surface-300 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors">
                  {isSaving ? "Saving…" : editTarget ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "products",   label: "Products",   icon: Package },
  { id: "categories", label: "Categories", icon: FolderTree },
];

const ProductsPage = () => {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-4">
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
            {label}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "products"   && <ProductsTab />}
      {activeTab === "categories" && <CategoriesTab />}
    </div>
  );
};

export default ProductsPage;
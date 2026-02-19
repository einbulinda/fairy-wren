import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Grid,
  FolderTree,
  Plus,
  Search,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  X,
  Package,
} from "lucide-react";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useUpdateProductStatus,
} from "@/hooks/useProducts";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useUpdateCategoryStatus,
} from "@/hooks/useCategories";

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

const EMPTY_CATEGORY = { name: "", description: "" };

// ─── Products Tab ─────────────────────────────────────────────────────────────

const ProductsTab = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);

  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const statusMutation = useUpdateProductStatus();

  const filtered = useMemo(() => {
    let list = products;
    if (!showInactive) list = list.filter((p) => p.active);
    if (filterCategory) list = list.filter((p) => p.category_id === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, search, filterCategory, showInactive]);

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
          <input className={inputCls + " pl-9"} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputCls + " sm:w-44"}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer whitespace-nowrap self-center">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
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
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Cost</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-400">No products found</td></tr>
            ) : filtered.map((p) => (
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

// ─── Categories Tab ───────────────────────────────────────────────────────────

const CategoriesTab = () => {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);

  const { data: categories = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const statusMutation = useUpdateCategoryStatus();

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_CATEGORY);
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setForm({ name: c.name, description: c.description || "" });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setFormOpen(false);
    } catch {
      // handled by mutation
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className={inputCls + " pl-9"} placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm font-medium transition-colors">
          <Plus size={15} /> New Category
        </button>
      </div>

      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Description</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-400">No categories found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="hover:bg-surface-700/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                <td className="px-4 py-3 text-surface-400 hidden sm:table-cell">{c.description || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => statusMutation.mutate({ id: c.id, active: !c.active })} title="Toggle status">
                    {c.active
                      ? <ToggleRight size={20} className="text-green-400 mx-auto" />
                      : <ToggleLeft size={20} className="text-surface-500 mx-auto" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-surface-600 rounded text-surface-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-surface-800 border-l border-surface-700 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-surface-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">{editTarget ? "Edit Category" : "New Category"}</h2>
              <button onClick={() => setFormOpen(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} />
              </div>
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
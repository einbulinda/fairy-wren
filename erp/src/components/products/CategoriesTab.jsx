import { useState, useMemo } from "react";
import { Search, Plus, ToggleLeft, ToggleRight, Edit2, X } from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useUpdateCategoryStatus,
} from "@/hooks/useCategories";

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const DEFAULT_COLOR = "#6366FFFF";

const EMPTY_CATEGORY = { name: "", color: DEFAULT_COLOR };

// Native <input type="color"> only accepts #rrggbb — strip the alpha byte
const toPickerValue = (color) =>
  color ? color.slice(0, 7) : DEFAULT_COLOR.slice(0, 7);

// Re-attach alpha when the user changes the RGB portion
const applyPickerChange = (hex6, existingColor) => {
  const alpha = existingColor?.length === 9 ? existingColor.slice(7) : "FF";
  return hex6 + alpha;
};

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
    setForm({ name: c.name, color: c.color || DEFAULT_COLOR });
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
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-400">No categories found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="hover:bg-surface-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: c.color ? c.color.slice(0, 7) : "#6366FF" }}
                    />
                    <span className="font-medium text-white">{c.name}</span>
                  </div>
                </td>
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
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={toPickerValue(form.color)}
                    onChange={(e) =>
                      setForm({ ...form, color: applyPickerChange(e.target.value, form.color) })
                    }
                    className="h-10 w-16 rounded-lg cursor-pointer bg-transparent border border-surface-600 p-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full ring-1 ring-white/10"
                      style={{ backgroundColor: form.color ? form.color.slice(0, 7) : "#6366FF" }}
                    />
                    <span className="text-xs text-surface-400 font-mono">{form.color?.toUpperCase()}</span>
                  </div>
                </div>
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

export default CategoriesTab;

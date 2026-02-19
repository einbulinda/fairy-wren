import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Building2,
  ChevronRight,
  X,
  Truck,
} from "lucide-react";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
} from "@/hooks/useSuppliers";
import toast from "react-hot-toast";

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const EMPTY_FORM = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

const SupplierListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: suppliers = [], isLoading } = useSuppliers();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const filtered = useMemo(() => {
    let list = suppliers;
    if (!showInactive) list = list.filter((s) => s.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.contact_person?.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.email?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [suppliers, search, showInactive]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (supplier) => {
    setEditTarget(supplier);
    setForm({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...form },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(form, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleToggleStatus = (supplier) => {
    updateMutation.mutate({ id: supplier.id, active: !supplier.active });
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-surface-400 text-xs mb-1">Total Suppliers</div>
          <p className="text-2xl font-bold text-white">{suppliers.length}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-surface-400 text-xs mb-1">Active</div>
          <p className="text-2xl font-bold text-green-400">
            {suppliers.filter((s) => s.active).length}
          </p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 hidden sm:block">
          <div className="text-surface-400 text-xs mb-1">Inactive</div>
          <p className="text-2xl font-bold text-surface-400">
            {suppliers.filter((s) => !s.active).length}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main list */}
        <div className={`flex-1 min-w-0 space-y-4 ${formOpen ? "hidden lg:block" : ""}`}>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full pl-9 pr-8 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-primary-500"
              />
              Show inactive
            </label>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              New Supplier
            </button>
          </div>

          {/* Table */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Suppliers</h2>
              <span className="text-xs text-surface-400">
                {filtered.length} supplier{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-surface-500">
                <Truck size={36} className="mx-auto mb-3 text-surface-700" />
                <p>
                  {search
                    ? "No suppliers match your search."
                    : "No suppliers yet. Create one to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/30">
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Supplier
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">
                        Phone
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden xl:table-cell">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-surface-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {filtered.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="hover:bg-surface-700/30 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              navigate(`/suppliers/${supplier.id}`)
                            }
                            className="flex items-center gap-2 text-white hover:text-primary-400 transition-colors font-medium"
                          >
                            <Building2
                              size={15}
                              className="text-surface-500 shrink-0"
                            />
                            {supplier.name}
                            <ChevronRight
                              size={13}
                              className="text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                          {supplier.contact_person || "—"}
                        </td>
                        <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">
                          {supplier.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-surface-400 hidden xl:table-cell">
                          {supplier.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              supplier.active
                                ? "bg-green-500/15 text-green-400"
                                : "bg-surface-700 text-surface-400"
                            }`}
                          >
                            {supplier.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(supplier)}
                              className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(supplier)}
                              className={`p-1.5 hover:bg-surface-700 rounded-lg transition-colors ${
                                supplier.active
                                  ? "text-green-400 hover:text-red-400"
                                  : "text-surface-500 hover:text-green-400"
                              }`}
                              title={
                                supplier.active ? "Deactivate" : "Activate"
                              }
                            >
                              {supplier.active ? (
                                <ToggleRight size={16} />
                              ) : (
                                <ToggleLeft size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Form panel */}
        {formOpen && (
          <div className="w-full lg:w-80 xl:w-96 shrink-0 bg-surface-800/50 border border-surface-700 rounded-xl p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-500/15 rounded-lg">
                  <Truck size={15} className="text-primary-400" />
                </div>
                <h2 className="font-semibold text-white">
                  {editTarget ? "Edit Supplier" : "New Supplier"}
                </h2>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="text-surface-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Supplier name"
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contact_person: e.target.value,
                    }))
                  }
                  placeholder="Full name"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+254 7xx xxx xxx"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@supplier.com"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Physical address"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 px-4 py-2 border border-surface-600 text-surface-300 rounded-lg text-sm hover:bg-surface-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {editTarget ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierListPage;

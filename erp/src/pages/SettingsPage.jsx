import { useState, useEffect } from "react";
import { Save, Building2, Loader2, Plus, Pencil, Trash2, X, Check, BookOpen, Shield } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import {
  useAccountClasses,
  useCreateAccountClass,
  useUpdateAccountClass,
  useDeleteAccountClass,
} from "@/hooks/useAccountClasses";
import {
  useSystemRoles,
  useCreateSystemRole,
  useUpdateSystemRole,
  useDeleteSystemRole,
} from "@/hooks/useSystemRoles";
import toast from "react-hot-toast";
import { inputCls } from "@/utils/constants";

const labelCls = "block text-sm font-medium text-surface-300 mb-1";
const tabCls = (active) =>
  `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
    active
      ? "bg-surface-900 text-white border border-surface-700 border-b-transparent"
      : "text-surface-400 hover:text-surface-200"
  }`;

const FIELDS = [
  { key: "organisation_name", label: "Organisation Name", placeholder: "e.g. Fairy Wren Limited" },
  { key: "currency", label: "Currency", placeholder: "e.g. KES" },
  { key: "tax_pin", label: "Tax PIN", placeholder: "e.g. P0123456789A" },
  { key: "address", label: "Address", placeholder: "e.g. 123 Main St, Nairobi" },
  { key: "phone", label: "Phone", placeholder: "e.g. +254 700 000000" },
  { key: "email", label: "Email", placeholder: "e.g. info@company.co.ke" },
];

const CATEGORIES = ["asset", "liability", "equity", "income", "expense"];

// ── Organisation Tab ──
const OrganisationTab = () => {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => toast.success("Settings saved"),
      onError: () => toast.error("Failed to save settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <input
              type="text"
              className={inputCls}
              placeholder={placeholder}
              value={form[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Account Classes Tab ──
const AccountClassesTab = () => {
  const { data: classes, isLoading } = useAccountClasses();
  const createMutation = useCreateAccountClass();
  const updateMutation = useUpdateAccountClass();
  const deleteMutation = useDeleteAccountClass();
  const [adding, setAdding] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [form, setForm] = useState({ code: "", label: "", category: "asset", sort_order: 0 });

  const resetForm = () => {
    setForm({ code: "", label: "", category: "asset", sort_order: 0 });
    setAdding(false);
    setEditCode(null);
  };

  const handleAdd = () => {
    createMutation.mutate(form, { onSuccess: resetForm });
  };

  const handleUpdate = () => {
    updateMutation.mutate({ code: editCode, ...form }, { onSuccess: resetForm });
  };

  const startEdit = (item) => {
    setEditCode(item.code);
    setForm({ label: item.label, category: item.category, sort_order: item.sort_order });
    setAdding(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">
          Define the account classifications used in the chart of accounts.
        </p>
        {!adding && !editCode && (
          <button
            onClick={() => { setAdding(true); setEditCode(null); setForm({ code: "", label: "", category: "asset", sort_order: 0 }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Class
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(adding || editCode) && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {adding && (
              <div>
                <label className={labelCls}>Code</label>
                <input
                  className={inputCls}
                  placeholder="e.g. current_asset"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={inputCls}
                placeholder="e.g. Current Asset"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={adding ? handleAdd : handleUpdate}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <Check size={14} /> {adding ? "Add" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg transition-colors"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400 text-left">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Label</th>
              <th className="py-2 px-3 font-medium">Category</th>
              <th className="py-2 px-3 font-medium">Order</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(classes || []).map((item) => (
              <tr key={item.code} className="border-b border-surface-800 hover:bg-surface-800/50">
                <td className="py-2 px-3 text-white font-mono text-xs">{item.code}</td>
                <td className="py-2 px-3 text-white">{item.label}</td>
                <td className="py-2 px-3 text-surface-300 capitalize">{item.category}</td>
                <td className="py-2 px-3 text-surface-400">{item.sort_order}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete account class "${item.label}"?`)) {
                          deleteMutation.mutate(item.code);
                        }
                      }}
                      className="p-1 text-surface-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Capabilities ──
const CAPABILITIES = [
  { key: "pos_access", label: "POS Access", description: "Can use the POS ordering system" },
  { key: "stock_take", label: "Stock Take", description: "Can perform stock takes from POS" },
  { key: "erp_access", label: "ERP Access", description: "Can access the ERP back-office" },
  { key: "approve_payments", label: "Approve Payments", description: "Can confirm payment requests" },
  { key: "view_all_bills", label: "View All Bills", description: "Can see all bills, not just own" },
];

// ── System Roles Tab ──
const SystemRolesTab = () => {
  const { data: roles, isLoading } = useSystemRoles();
  const createMutation = useCreateSystemRole();
  const updateMutation = useUpdateSystemRole();
  const deleteMutation = useDeleteSystemRole();
  const [adding, setAdding] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [permEditCode, setPermEditCode] = useState(null);
  const [permDraft, setPermDraft] = useState([]);
  const [form, setForm] = useState({ code: "", label: "", sort_order: 0 });

  const resetForm = () => {
    setForm({ code: "", label: "", sort_order: 0 });
    setAdding(false);
    setEditCode(null);
  };

  const handleAdd = () => {
    createMutation.mutate(form, { onSuccess: resetForm });
  };

  const handleUpdate = () => {
    updateMutation.mutate({ code: editCode, ...form }, { onSuccess: resetForm });
  };

  const startEdit = (item) => {
    setEditCode(item.code);
    setForm({ label: item.label, sort_order: item.sort_order });
    setAdding(false);
    setPermEditCode(null);
  };

  const startPermEdit = (item) => {
    setPermEditCode(item.code);
    setPermDraft([...(item.permissions || [])]);
    setAdding(false);
    setEditCode(null);
  };

  const togglePerm = (key) => {
    setPermDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const savePerm = () => {
    updateMutation.mutate(
      { code: permEditCode, permissions: permDraft },
      { onSuccess: () => { setPermEditCode(null); setPermDraft([]); } },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">
          Define the roles available for system users and assign their permissions.
        </p>
        {!adding && !editCode && (
          <button
            onClick={() => { setAdding(true); setEditCode(null); setPermEditCode(null); setForm({ code: "", label: "", sort_order: 0 }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Role
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(adding || editCode) && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adding && (
              <div>
                <label className={labelCls}>Code</label>
                <input
                  className={inputCls}
                  placeholder="e.g. cashier"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={inputCls}
                placeholder="e.g. Cashier"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={adding ? handleAdd : handleUpdate}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <Check size={14} /> {adding ? "Add" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg transition-colors"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400 text-left">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Label</th>
              <th className="py-2 px-3 font-medium">Permissions</th>
              <th className="py-2 px-3 font-medium">Order</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(roles || []).map((item) => (
              <tr key={item.code} className="border-b border-surface-800 hover:bg-surface-800/50">
                <td className="py-2 px-3 text-white font-mono text-xs">{item.code}</td>
                <td className="py-2 px-3 text-white">{item.label}</td>
                <td className="py-2 px-3">
                  {(item.permissions || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(item.permissions || []).map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-300 font-medium">
                          {CAPABILITIES.find((c) => c.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-surface-500">None</span>
                  )}
                </td>
                <td className="py-2 px-3 text-surface-400">{item.sort_order}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startPermEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400 transition-colors"
                      title="Manage Permissions"
                    >
                      <Shield size={14} />
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete role "${item.label}"?`)) {
                          deleteMutation.mutate(item.code);
                        }
                      }}
                      className="p-1 text-surface-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission editor */}
      {permEditCode && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield size={15} className="text-primary-400" />
            Permissions for <span className="font-mono text-primary-300">{permEditCode}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CAPABILITIES.map(({ key, label, description }) => (
              <label
                key={key}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  permDraft.includes(key)
                    ? "border-primary-500/40 bg-primary-500/10"
                    : "border-surface-700 hover:border-surface-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={permDraft.includes(key)}
                  onChange={() => togglePerm(key)}
                  className="mt-0.5 accent-primary-500"
                />
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-surface-400">{description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={savePerm}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <Check size={14} /> Save Permissions
            </button>
            <button
              onClick={() => { setPermEditCode(null); setPermDraft([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg transition-colors"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Settings Page ──
const TABS = [
  { key: "organisation", label: "Organisation", icon: Building2 },
  { key: "account-classes", label: "Account Classes", icon: BookOpen },
  { key: "system-roles", label: "System Roles", icon: Shield },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("organisation");

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-600/20 rounded-lg">
          <Building2 size={22} className="text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Settings</h3>
          <p className="text-sm text-surface-400">
            Manage organisation details, account classes, and system roles
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700 mb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={tabCls(activeTab === key)}>
            <span className="flex items-center gap-1.5">
              <Icon size={14} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-surface-900 border border-surface-700 border-t-0 rounded-b-xl p-6">
        {activeTab === "organisation" && <OrganisationTab />}
        {activeTab === "account-classes" && <AccountClassesTab />}
        {activeTab === "system-roles" && <SystemRolesTab />}
      </div>
    </div>
  );
};

export default SettingsPage;

import { useState, useEffect } from "react";
import { Save, Building2, Loader2 } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import toast from "react-hot-toast";

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const labelCls = "block text-sm font-medium text-surface-300 mb-1";

const FIELDS = [
  { key: "organisation_name", label: "Organisation Name", placeholder: "e.g. Fairy Wren Limited" },
  { key: "currency", label: "Currency", placeholder: "e.g. KES" },
  { key: "tax_pin", label: "Tax PIN", placeholder: "e.g. P0123456789A" },
  { key: "address", label: "Address", placeholder: "e.g. 123 Main St, Nairobi" },
  { key: "phone", label: "Phone", placeholder: "e.g. +254 700 000000" },
  { key: "email", label: "Email", placeholder: "e.g. info@company.co.ke" },
];

const SettingsPage = () => {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-surface-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-lg">
            <Building2 size={22} className="text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Organisation Settings
            </h3>
            <p className="text-sm text-surface-400">
              Configure your organisation details and defaults
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {updateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-6">
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
    </div>
  );
};

export default SettingsPage;

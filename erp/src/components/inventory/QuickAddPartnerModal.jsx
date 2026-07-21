import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { useCreatePartner } from "@/hooks/useExchanges";
import { inputCls } from "./inventoryUtils";

const EMPTY = { name: "", contact_person: "", phone: "", notes: "" };

const QuickAddPartnerModal = ({ onCreated, onClose }) => {
  const [form, setForm] = useState(EMPTY);
  const createMutation = useCreatePartner();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      const created = await createMutation.mutateAsync({
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Building2 size={16} className="text-primary-400" />
            New Business Partner
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Business Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Business name"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Contact Person</label>
            <input
              value={form.contact_person}
              onChange={(e) => set("contact_person", e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
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
              disabled={createMutation.isPending || !form.name.trim()}
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

export default QuickAddPartnerModal;

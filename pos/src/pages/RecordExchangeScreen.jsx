import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  X,
  Search,
  Save,
  Building2,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { exchangesService } from "../services/exchanges.service";
import ExchangeReportView from "./ExchangeReportView";
import api from "@/api";

const localDateStr = () => new Date().toLocaleDateString("en-CA");

export default function RecordExchangeScreen() {
  const [view, setView] = useState("new");

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight size={20} className="text-yellow-400" />
        <h1 className="text-lg font-bold text-white">Product Exchanges</h1>
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit mb-4">
        <button
          onClick={() => setView("new")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "new" ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          New Exchange
        </button>
        <button
          onClick={() => setView("report")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "report" ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          Report
        </button>
      </div>

      {view === "new" ? <NewExchangeForm /> : <ExchangeReportView />}
    </div>
  );
}

function NewExchangeForm() {
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    partner_id: "",
    direction: "outbound",
    exchange_date: localDateStr(),
    notes: "",
  });
  const [lines, setLines] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: "", contact_person: "", phone: "" });
  const [creatingPartner, setCreatingPartner] = useState(false);

  useEffect(() => {
    exchangesService.getPartners().then((res) => {
      const data = res.data ?? res;
      setPartners([...data].sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(console.error);

    api.get("/inventory/items").then((res) => {
      setProducts(res.data?.data ?? res.data ?? []);
    }).catch(console.error);
  }, []);

  const filteredProducts = searchQ
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQ.toLowerCase()) &&
        !lines.some((l) => l.product_id === p.id),
      )
    : products.filter((p) => !lines.some((l) => l.product_id === p.id));

  const addProduct = (product) => {
    setLines((prev) => [
      ...prev,
      { product_id: product.id, product_name: product.name, quantity: 1 },
    ]);
    setSearchQ("");
    setShowSearch(false);
  };

  const updateQty = useCallback((idx, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: parseInt(value) || 0 };
      return updated;
    });
  }, []);

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) { toast.error("Enter a business name"); return; }

    setCreatingPartner(true);
    try {
      const result = await exchangesService.createPartner({
        name: partnerForm.name.trim(),
        contact_person: partnerForm.contact_person.trim() || null,
        phone: partnerForm.phone.trim() || null,
      });
      const partner = result?.data ?? result;
      setPartners((prev) => [...prev, partner].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, partner_id: partner.id }));
      setPartnerForm({ name: "", contact_person: "", phone: "" });
      setShowAddPartner(false);
      toast.success("Business partner added");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to add business partner");
    } finally {
      setCreatingPartner(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partner_id) { toast.error("Select a business partner"); return; }
    if (lines.length === 0) { toast.error("Add at least one product"); return; }
    if (lines.some((l) => !l.quantity || l.quantity <= 0)) { toast.error("All quantities must be > 0"); return; }

    setSubmitting(true);
    try {
      const result = await exchangesService.createExchange({
        ...form,
        line_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      });
      setSubmitResult(result?.data ?? result);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to submit exchange");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({ partner_id: "", direction: "outbound", exchange_date: localDateStr(), notes: "" });
    setLines([]);
    setSubmitted(false);
    setSubmitResult(null);
  };

  const isApproved = submitResult?.approval_status === "approved";

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <div className={`rounded-full p-5 ${isApproved ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
          <CheckCircle size={48} className={isApproved ? "text-green-400" : "text-yellow-400"} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isApproved ? "Exchange Recorded" : "Exchange Submitted"}
          </h2>
          <p className="text-gray-400 text-sm max-w-xs">
            {isApproved
              ? "Inventory has been updated immediately."
              : "Your exchange has been submitted and is pending approval. Stock levels will be updated once an approver reviews it."}
          </p>
        </div>
        <button
          onClick={reset}
          className={`px-6 py-2.5 font-semibold rounded-xl transition-colors ${isApproved ? "bg-green-600 hover:bg-green-500 text-white" : "bg-yellow-500 hover:bg-yellow-400 text-black"}`}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, direction: "outbound" })}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
              form.direction === "outbound"
                ? "bg-yellow-500 border-yellow-500 text-black"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            <ArrowUpRight size={14} /> Outbound
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, direction: "inbound" })}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
              form.direction === "inbound"
                ? "bg-yellow-500 border-yellow-500 text-black"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            <ArrowDownLeft size={14} /> Inbound
          </button>
        </div>

        {/* Partner + date */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Business Partner *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={form.partner_id}
                  onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                  required
                  className="w-full pl-8 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Select business…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartner(true)}
                className="px-3 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors shrink-0"
                title="Add new business partner"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Date *</label>
            <input
              type="date"
              value={form.exchange_date}
              onChange={(e) => setForm({ ...form, exchange_date: e.target.value })}
              required
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">
              Products ({lines.length})
            </span>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">
              Tap <strong>Add</strong> to add products
            </p>
          ) : (
            <div className="divide-y divide-gray-700/60">
              {lines.map((line, idx) => (
                <div key={idx} className="p-3 flex items-center gap-2">
                  <p className="text-white text-sm font-medium flex-1 min-w-0 truncate">{line.product_name}</p>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateQty(idx, e.target.value)}
                    className="w-20 px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="shrink-0 p-1 text-red-400 hover:text-red-300 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Optional"
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || lines.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors"
        >
          <Save size={16} />
          {submitting ? "Submitting…" : "Submit for Approval"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Submitted exchanges require approval before stock is updated.
        </p>
      </form>

      {/* Product search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-gray-700">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products…"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQ(""); }}
                className="shrink-0 p-1 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredProducts.slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 text-left transition-colors border-b border-gray-700/50 last:border-0"
                >
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-gray-500 text-xs font-mono ml-2 shrink-0">
                    {p.current_stock ?? 0} in stock
                  </span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">No products found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add business partner modal */}
      {showAddPartner && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="flex items-center gap-2 text-white font-semibold text-sm">
                <Building2 size={16} className="text-yellow-400" /> New Business Partner
              </span>
              <button
                type="button"
                onClick={() => setShowAddPartner(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreatePartner} className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Business Name *</label>
                <input
                  autoFocus
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="Business name"
                  required
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Contact Person</label>
                <input
                  value={partnerForm.contact_person}
                  onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Phone</label>
                <input
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPartner(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPartner || !partnerForm.name.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold transition-colors"
                >
                  {creatingPartner ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

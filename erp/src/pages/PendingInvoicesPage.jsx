import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  X,
} from "lucide-react";
import { usePendingInvoices } from "@/hooks/useSuppliers";
import { useMarkReceiptPaid } from "@/hooks/useInventory";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import toast from "react-hot-toast";

const PAGE_SIZE = 15;

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const daysOutstanding = (purchaseDate) => {
  if (!purchaseDate) return 0;
  return Math.floor((Date.now() - new Date(purchaseDate).getTime()) / 86400000);
};

const agingBucket = (days) => {
  if (days <= 30) return { label: "Current", color: "text-green-400 bg-green-500/15" };
  if (days <= 60) return { label: "31-60 days", color: "text-yellow-400 bg-yellow-500/15" };
  if (days <= 90) return { label: "61-90 days", color: "text-orange-400 bg-orange-500/15" };
  return { label: "90+ days", color: "text-red-400 bg-red-500/15" };
};

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const PAYMENT_METHODS = [
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
];

const PendingInvoicesPage = () => {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = usePendingInvoices();
  const markPaid = useMarkReceiptPaid();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState("purchase_date");
  const [sortDir, setSortDir] = useState("asc");
  const [payingId, setPayingId] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_method: "bank",
    reference: "",
    notes: "",
  });

  const sorted = useMemo(() => {
    const list = [...invoices];
    list.sort((a, b) => {
      let va, vb;
      if (sortField === "days") {
        va = daysOutstanding(a.purchase_date);
        vb = daysOutstanding(b.purchase_date);
      } else if (sortField === "total_amount") {
        va = Number(a.total_amount);
        vb = Number(b.total_amount);
      } else if (sortField === "supplier") {
        va = a.suppliers?.name?.toLowerCase() || "";
        vb = b.suppliers?.name?.toLowerCase() || "";
      } else {
        va = a[sortField] || "";
        vb = b[sortField] || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [invoices, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

  // Aging summary
  const aging = useMemo(() => {
    const buckets = { current: 0, "31-60": 0, "61-90": 0, "90+": 0 };
    invoices.forEach((inv) => {
      const days = daysOutstanding(inv.purchase_date);
      const amt = Number(inv.total_amount ?? 0);
      if (days <= 30) buckets.current += amt;
      else if (days <= 60) buckets["31-60"] += amt;
      else if (days <= 90) buckets["61-90"] += amt;
      else buckets["90+"] += amt;
    });
    return buckets;
  }, [invoices]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortHeader = ({ field, children, className = "" }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`px-4 py-3 text-surface-400 font-medium cursor-pointer hover:text-white transition-colors select-none ${className}`}
    >
      {children}
      {sortField === field && (
        <span className="ml-1 text-primary-400">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  const handlePay = (e) => {
    e.preventDefault();
    if (!payForm.reference.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    markPaid.mutate(
      { id: payingId, ...payForm },
      {
        onSuccess: () => {
          setPayingId(null);
          setPayForm({ payment_method: "bank", reference: "", notes: "" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Aging summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-xs text-surface-500 mb-1">Total Outstanding</div>
          <div className="text-lg font-bold text-white">{fmt(totalOutstanding)}</div>
          <div className="text-xs text-surface-400 mt-1">{invoices.length} invoices</div>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-xs text-green-400 mb-1">Current (0-30d)</div>
          <div className="text-lg font-bold text-white">{fmt(aging.current)}</div>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-xs text-yellow-400 mb-1">31-60 Days</div>
          <div className="text-lg font-bold text-white">{fmt(aging["31-60"])}</div>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-xs text-orange-400 mb-1">61-90 Days</div>
          <div className="text-lg font-bold text-white">{fmt(aging["61-90"])}</div>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-red-400 mb-1">90+ Days</div>
          <div className="text-lg font-bold text-white">{fmt(aging["90+"])}</div>
        </div>
      </div>

      {/* Payment form modal */}
      {payingId && (
        <div className="bg-surface-800/50 border border-primary-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/15 rounded-lg">
                <CreditCard size={14} className="text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Process Payment</h3>
              <span className="text-xs text-surface-400">
                — {sorted.find((i) => i.id === payingId)?.invoice_number} ({fmt(sorted.find((i) => i.id === payingId)?.total_amount)})
              </span>
            </div>
            <button onClick={() => setPayingId(null)} className="p-1 text-surface-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handlePay} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Payment Method *</label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                className={inputCls}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Reference No. *</label>
              <input
                type="text"
                value={payForm.reference}
                onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="Cheque no, M-Pesa ref..."
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Notes</label>
              <input
                type="text"
                value={payForm.notes}
                onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={markPaid.isPending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {markPaid.isPending ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Pending Supplier Invoices</h2>
          <span className="text-xs text-surface-400">{invoices.length} unpaid</span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <FileText size={36} className="mx-auto mb-3 text-surface-700" />
            <p className="text-sm">No pending invoices. All supplier bills are paid.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-800/30">
                    <SortHeader field="purchase_date" className="text-left">Date</SortHeader>
                    <SortHeader field="invoice_number" className="text-left">Invoice #</SortHeader>
                    <SortHeader field="supplier" className="text-left">Supplier</SortHeader>
                    <SortHeader field="days" className="text-center">Aging</SortHeader>
                    <SortHeader field="total_amount" className="text-right">Amount</SortHeader>
                    <th className="px-4 py-3 text-center text-surface-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/40">
                  {pageItems.map((inv) => {
                    const days = daysOutstanding(inv.purchase_date);
                    const bucket = agingBucket(days);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-4 py-3 text-surface-300">{fmtDate(inv.purchase_date)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/inventory/receipts/${inv.id}`)}
                            className="font-mono text-xs text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            {inv.invoice_number}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-surface-300">
                          <button
                            onClick={() => navigate(`/suppliers/${inv.supplier_id}`)}
                            className="flex items-center gap-1.5 text-surface-300 hover:text-white transition-colors"
                          >
                            <Building2 size={12} className="text-surface-500" />
                            {inv.suppliers?.name || "—"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bucket.color}`}>
                            <Clock size={10} />
                            {days}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white tabular-nums">
                          {fmt(inv.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setPayingId(inv.id);
                              setPayForm({ payment_method: "bank", reference: "", notes: "" });
                            }}
                            className="px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-lg text-xs font-medium transition-colors"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <MobileCardList>
              {pageItems.map((inv) => {
                const days = daysOutstanding(inv.purchase_date);
                const bucket = agingBucket(days);
                return (
                  <MobileCard key={inv.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-surface-300 text-sm">{fmtDate(inv.purchase_date)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bucket.color}`}>
                        <Clock size={10} />
                        {days}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <button
                          onClick={() => navigate(`/inventory/receipts/${inv.id}`)}
                          className="font-mono text-xs text-primary-400"
                        >
                          {inv.invoice_number}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-surface-400 mt-0.5">
                          <Building2 size={10} />
                          {inv.suppliers?.name || "—"}
                        </div>
                      </div>
                      <span className="text-white font-medium text-sm tabular-nums">{fmt(inv.total_amount)}</span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => {
                          setPayingId(inv.id);
                          setPayForm({ payment_method: "bank", reference: "", notes: "" });
                        }}
                        className="px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-lg text-xs font-medium transition-colors"
                      >
                        Process Payment
                      </button>
                    </div>
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  Total: <span className="text-white font-bold">{fmt(totalOutstanding)}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs text-surface-400">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PendingInvoicesPage;

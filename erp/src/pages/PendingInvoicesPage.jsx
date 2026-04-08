import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  FileText,
  Building2,
  CreditCard,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePendingInvoices } from "@/hooks/useSuppliers";
import { useMarkReceiptPaid } from "@/hooks/useInventory";
import { fetchAccounts } from "@/services/accounts.service";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import PaginatedTable from "@/components/shared/PaginatedTable";
import toast from "react-hot-toast";
import { fmt, fmtDate } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

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
  const [payingId, setPayingId] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_method: "bank",
    bank_account_id: "",
    reference: "",
    amount: "",
    notes: "",
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const leafBankAccounts = useMemo(() => {
    const all = accounts.filter((a) => a.account_class === "bank" && a.active);
    const leaves = all.filter((a) => a.parent_id !== null);
    return leaves.length > 0 ? leaves : all;
  }, [accounts]);

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

  const handlePay = (e) => {
    e.preventDefault();
    if (!payForm.reference.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    markPaid.mutate(
      { id: payingId, ...payForm, amount: payForm.amount ? parseFloat(payForm.amount) : undefined },
      {
        onSuccess: () => {
          setPayingId(null);
          setPayForm({ payment_method: "bank", bank_account_id: "", reference: "", amount: "", notes: "" });
        },
      },
    );
  };

  const columns = [
    {
      key: "purchase_date",
      label: "Date",
      sortable: true,
      cellClassName: "text-surface-300",
      render: (_val, inv) => fmtDate(inv.purchase_date),
    },
    {
      key: "invoice_number",
      label: "Invoice #",
      sortable: true,
      render: (_val, inv) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/inventory/receipts/${inv.id}`); }}
          className="font-mono text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          {inv.invoice_number}
        </button>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      sortable: true,
      sortFn: (a, b) =>
        (a.suppliers?.name || "").localeCompare(b.suppliers?.name || ""),
      render: (_val, inv) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/${inv.supplier_id}`); }}
          className="flex items-center gap-1.5 text-surface-300 hover:text-white transition-colors"
        >
          <Building2 size={12} className="text-surface-500" />
          {inv.suppliers?.name || "—"}
        </button>
      ),
    },
    {
      key: "days",
      label: "Aging",
      align: "center",
      sortable: true,
      sortFn: (a, b) => daysOutstanding(a.purchase_date) - daysOutstanding(b.purchase_date),
      render: (_val, inv) => {
        const days = daysOutstanding(inv.purchase_date);
        const bucket = agingBucket(days);
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bucket.color}`}>
            <Clock size={10} />
            {days}d
          </span>
        );
      },
    },
    {
      key: "total_amount",
      label: "Amount",
      align: "right",
      sortable: true,
      cellClassName: "font-medium text-white tabular-nums",
      sortFn: (a, b) => Number(a.total_amount) - Number(b.total_amount),
      render: (val) => fmt(val),
    },
    {
      key: "_action",
      label: "Action",
      align: "center",
      render: (_val, inv) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPayingId(inv.id);
            setPayForm({ payment_method: "bank", bank_account_id: "", reference: "", amount: "", notes: "" });
          }}
          className="px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-lg text-xs font-medium transition-colors"
        >
          Pay
        </button>
      ),
    },
  ];

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
                — {invoices.find((i) => i.id === payingId)?.invoice_number} ({fmt(invoices.find((i) => i.id === payingId)?.total_amount)})
              </span>
            </div>
            <button onClick={() => setPayingId(null)} className="p-1 text-surface-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handlePay} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Payment Method *</label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value, bank_account_id: "" }))}
                className={inputCls}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {payForm.payment_method === "bank" && (
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">Bank Account *</label>
                <select
                  value={payForm.bank_account_id}
                  onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className={inputCls}
                  required
                >
                  <option value="">Select bank account…</option>
                  {leafBankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={fmt(invoices.find((i) => i.id === payingId)?.total_amount)}
                className={inputCls}
              />
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
            <div className="sm:col-span-5 flex justify-end">
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
            <div className="hidden md:block">
              <PaginatedTable
                columns={columns}
                data={invoices}
                rowKey="id"
                defaultSort={{ key: "purchase_date", dir: "asc" }}
                defaultPageSize={20}
                emptyMessage="No pending invoices."
              />
            </div>

            {/* Mobile cards */}
            <MobileCardList>
              {invoices.map((inv) => {
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
                          setPayForm({ payment_method: "bank", bank_account_id: "", reference: "", amount: "", notes: "" });
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
          </>
        )}
      </div>
    </div>
  );
};

export default PendingInvoicesPage;

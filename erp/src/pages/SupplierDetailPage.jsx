import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Package,
  CreditCard,
  FileText,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Banknote,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@/services/accounts.service";
import {
  useSupplier,
  useSupplierPurchases,
  useSupplierPayments,
  useCreateSupplierPayment,
  useSupplierStatement,
  useUnpaidInvoices,
} from "@/hooks/useSuppliers";
import { exportSupplierStatementCsv } from "@/services/suppliers.service";
import ReceiveTab from "@/components/inventory/ReceiveTab";
import toast from "react-hot-toast";
import {
  MobileCard,
  MobileField,
  MobileCardList,
} from "@/components/shared/MobileCard";
import { fmt, fmtDate } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const PAGE_SIZE = 10;

const dateInputCls =
  "px-2 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 w-36";

const TABS = [
  { id: "purchases", label: "Purchases", icon: Package },
  { id: "receive", label: "Receive Goods", icon: Truck },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "statement", label: "Statement", icon: FileText },
  { id: "pay", label: "Pay", icon: Banknote },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
];

const EMPTY_PAYMENT = {
  payment_date: new Date().toISOString().split("T")[0],
  amount: "",
  payment_method: "bank",
  reference: "",
  notes: "",
};

const TXN_TYPE_STYLES = {
  purchase: "bg-blue-500/15 text-blue-400",
  expense: "bg-orange-500/15 text-orange-400",
  payment: "bg-green-500/15 text-green-400",
};

const daysOutstanding = (purchaseDate) => {
  if (!purchaseDate) return null;
  return Math.floor((Date.now() - new Date(purchaseDate).getTime()) / 86400000);
};

const PaymentBadge = ({ paidAt, purchaseDate }) => {
  if (paidAt) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
        <CheckCircle2 size={10} />
        Paid
      </span>
    );
  }
  const days = daysOutstanding(purchaseDate);
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
      <Clock size={10} />
      {days != null ? `${days}d` : "Pending"}
    </span>
  );
};

const DateFilter = ({ from, setFrom, to, setTo, onClear }) => (
  <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-surface-700 bg-surface-800/20">
    <div>
      <label className="block text-xs text-surface-400 mb-1">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className={dateInputCls}
      />
    </div>
    <div>
      <label className="block text-xs text-surface-400 mb-1">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className={dateInputCls}
      />
    </div>
    {(from || to) && (
      <button
        onClick={onClear}
        className="text-xs text-surface-400 hover:text-white transition-colors pb-px"
      >
        Clear dates
      </button>
    )}
  </div>
);

const PaginationBar = ({ page, totalPages, setPage, left }) => {
  if (totalPages <= 1 && !left) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
      <div className="text-sm text-surface-400">{left}</div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-3 text-xs text-surface-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const SupplierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("purchases");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  // Date filters + pages per tab
  const [purchasesFrom, setPurchasesFrom] = useState("");
  const [purchasesTo, setPurchasesTo] = useState("");
  const [purchasesPage, setPurchasesPage] = useState(1);

  const [paymentsFrom, setPaymentsFrom] = useState("");
  const [paymentsTo, setPaymentsTo] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);

  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");
  const [stmtPage, setStmtPage] = useState(1);

  // Pay tab state
  const [payBankAccountId, setPayBankAccountId] = useState("");
  const [payAllocations, setPayAllocations] = useState({}); // { invoiceId: amount }
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paySubmitting, setPaySubmitting] = useState(false);

  const { data: supplier, isLoading: supplierLoading } = useSupplier(id);
  const { data: purchases = [], isLoading: purchasesLoading } =
    useSupplierPurchases(id);
  const { data: payments = [], isLoading: paymentsLoading } =
    useSupplierPayments(id);
  const { data: statement = [], isLoading: statementLoading } =
    useSupplierStatement(id, stmtFrom || undefined, stmtTo || undefined);
  const { data: unpaidInvoices = [], isLoading: unpaidLoading } =
    useUnpaidInvoices(id);
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.account_class === "bank" && a.active),
    [accounts],
  );
  const createPayment = useCreateSupplierPayment(id);

  // All-time totals for the profile card
  const totalPurchased = useMemo(
    () => purchases.reduce((s, p) => s + Number(p.total_amount ?? 0), 0),
    [purchases],
  );
  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    [payments],
  );
  const balance = totalPurchased - totalPaid;

  // Client-side date filtering for purchases & payments
  const filteredPurchases = useMemo(
    () =>
      purchases.filter((p) => {
        const d = p.purchase_date;
        if (purchasesFrom && d < purchasesFrom) return false;
        if (purchasesTo && d > purchasesTo) return false;
        return true;
      }),
    [purchases, purchasesFrom, purchasesTo],
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        const d = p.payment_date;
        if (paymentsFrom && d < paymentsFrom) return false;
        if (paymentsTo && d > paymentsTo) return false;
        return true;
      }),
    [payments, paymentsFrom, paymentsTo],
  );

  // Purchases pagination
  const pTotalPages = Math.max(
    1,
    Math.ceil(filteredPurchases.length / PAGE_SIZE),
  );
  const pSafePage = Math.min(purchasesPage, pTotalPages);
  const pPageItems = filteredPurchases.slice(
    (pSafePage - 1) * PAGE_SIZE,
    pSafePage * PAGE_SIZE,
  );
  const pFilteredTotal = filteredPurchases.reduce(
    (s, p) => s + Number(p.total_amount ?? 0),
    0,
  );

  // Payments pagination
  const pmTotalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );
  const pmSafePage = Math.min(paymentsPage, pmTotalPages);
  const pmPageItems = filteredPayments.slice(
    (pmSafePage - 1) * PAGE_SIZE,
    pmSafePage * PAGE_SIZE,
  );
  const pmFilteredTotal = filteredPayments.reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  // Statement pagination
  const stmtTotalPages = Math.max(1, Math.ceil(statement.length / PAGE_SIZE));
  const stmtSafePage = Math.min(stmtPage, stmtTotalPages);
  const stmtPageItems = statement.slice(
    (stmtSafePage - 1) * PAGE_SIZE,
    stmtSafePage * PAGE_SIZE,
  );

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentForm.payment_date || !paymentForm.amount) {
      toast.error("Date and amount are required");
      return;
    }
    createPayment.mutate(
      { ...paymentForm, amount: parseFloat(paymentForm.amount) },
      {
        onSuccess: () => {
          setShowPaymentForm(false);
          setPaymentForm(EMPTY_PAYMENT);
        },
      },
    );
  };

  // Pay tab helpers
  const payTotal = useMemo(
    () =>
      Object.values(payAllocations).reduce(
        (s, v) => s + (parseFloat(v) || 0),
        0,
      ),
    [payAllocations],
  );

  const handlePayAllocation = (invoiceId, value) => {
    setPayAllocations((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const handlePaySubmit = async () => {
    if (!payBankAccountId) {
      toast.error("Select a bank account");
      return;
    }
    const allocations = Object.entries(payAllocations)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([invoice_id, amount]) => ({
        invoice_id,
        amount: parseFloat(amount),
      }));
    if (allocations.length === 0) {
      toast.error("Enter amounts for at least one invoice");
      return;
    }
    // Validate no overpayments
    for (const alloc of allocations) {
      const inv = unpaidInvoices.find((i) => i.id === alloc.invoice_id);
      if (inv) {
        const outstanding =
          Number(inv.total_amount) - Number(inv.amount_paid || 0);
        if (alloc.amount > outstanding + 0.01) {
          toast.error(`Amount exceeds outstanding for ${inv.invoice_number}`);
          return;
        }
      }
    }
    setPaySubmitting(true);
    createPayment.mutate(
      {
        payment_date: payDate,
        amount: payTotal,
        payment_method: "bank",
        bank_account_id: payBankAccountId,
        reference: payReference || null,
        allocations,
      },
      {
        onSuccess: () => {
          setPayAllocations({});
          setPayReference("");
          setPayBankAccountId("");
          setPaySubmitting(false);
        },
        onSettled: () => setPaySubmitting(false),
      },
    );
  };

  if (supplierLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );

  if (!supplier)
    return (
      <div className="text-center py-16 text-surface-400">
        Supplier not found.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/suppliers")}
        className="flex items-center gap-1 text-surface-400 hover:text-white text-sm transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Suppliers
      </button>

      {/* Profile card */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {supplier.name}
                </h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    supplier.active
                      ? "bg-green-500/15 text-green-400"
                      : "bg-surface-700 text-surface-400"
                  }`}
                >
                  {supplier.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-surface-400">
              {supplier.contact_person && (
                <div className="flex items-center gap-2">
                  <User size={13} className="text-surface-600 shrink-0" />
                  {supplier.contact_person}
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-surface-600 shrink-0" />
                  {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-surface-600 shrink-0" />
                  {supplier.email}
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-surface-600 shrink-0" />
                  {supplier.address}
                </div>
              )}
            </div>
          </div>

          {/* Balance summary */}
          <div className="flex sm:flex-col gap-4 sm:gap-3 sm:items-end sm:min-w-40">
            <div className="flex-1 sm:flex-none sm:text-right">
              <div className="text-xs text-surface-500 mb-0.5">Purchased</div>
              <div className="text-lg font-bold text-white">
                {fmt(totalPurchased)}
              </div>
            </div>
            <div className="flex-1 sm:flex-none sm:text-right">
              <div className="text-xs text-surface-500 mb-0.5">Paid</div>
              <div className="text-lg font-bold text-green-400">
                {fmt(totalPaid)}
              </div>
            </div>
            <div className="flex-1 sm:flex-none sm:text-right">
              <div className="text-xs text-surface-500 mb-0.5">Balance Due</div>
              <div
                className={`text-xl font-bold ${
                  balance > 0
                    ? "text-red-400"
                    : balance < 0
                      ? "text-green-400"
                      : "text-surface-300"
                }`}
              >
                {fmt(Math.abs(balance))}
                {balance > 0 ? " DR" : balance < 0 ? " CR" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800/50 border border-surface-700 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary-600 text-white"
                : "text-surface-400 hover:text-white"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Purchases tab ─────────────────────────────────────────────────── */}
      {tab === "purchases" && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Inventory Purchases</h2>
            <span className="text-xs text-surface-400">
              {purchasesFrom || purchasesTo
                ? `${filteredPurchases.length} of ${purchases.length}`
                : purchases.length}{" "}
              receipt{purchases.length !== 1 ? "s" : ""}
            </span>
          </div>

          <DateFilter
            from={purchasesFrom}
            setFrom={setPurchasesFrom}
            to={purchasesTo}
            setTo={setPurchasesTo}
            onClear={() => {
              setPurchasesFrom("");
              setPurchasesTo("");
              setPurchasesPage(1);
            }}
          />

          {purchasesLoading ? (
            <div className="py-12 text-center text-surface-400">Loading...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <Package size={32} className="mx-auto mb-2 text-surface-700" />
              <p>
                {purchases.length === 0
                  ? "No inventory receipts from this supplier."
                  : "No receipts match the selected date range."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/30">
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Invoice #
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">
                        Notes
                      </th>
                      <th className="text-center px-4 py-3 text-surface-400 font-medium">
                        Payment
                      </th>
                      <th className="text-right px-4 py-3 text-surface-400 font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {pPageItems.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-surface-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-surface-300">
                          {fmtDate(p.purchase_date)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              navigate(`/inventory/receipts/${p.id}`)
                            }
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary-400 hover:text-primary-300 transition-colors group"
                          >
                            {p.invoice_number}
                            <ExternalLink
                              size={10}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                          {p.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PaymentBadge
                            paidAt={p.paid_at}
                            purchaseDate={p.purchase_date}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white">
                          {fmt(p.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <MobileCardList>
                {pPageItems.map((p) => (
                  <MobileCard
                    key={p.id}
                    onClick={() => navigate(`/inventory/receipts/${p.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-surface-300 text-sm">
                        {fmtDate(p.purchase_date)}
                      </span>
                      <PaymentBadge
                        paidAt={p.paid_at}
                        purchaseDate={p.purchase_date}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primary-400">
                        {p.invoice_number}
                      </span>
                      <span className="text-white font-medium text-sm">
                        {fmt(p.total_amount)}
                      </span>
                    </div>
                    {p.notes && (
                      <div className="text-xs text-surface-400">{p.notes}</div>
                    )}
                  </MobileCard>
                ))}
              </MobileCardList>

              <PaginationBar
                page={pSafePage}
                totalPages={pTotalPages}
                setPage={setPurchasesPage}
                left={
                  <span>
                    {purchasesFrom || purchasesTo ? "Period" : "Total"}:{" "}
                    <span className="text-white font-bold">
                      {fmt(pFilteredTotal)}
                    </span>
                  </span>
                }
              />
            </>
          )}
        </div>
      )}

      {/* ── Receive Goods tab ──────────────────────────────────────────────── */}
      {tab === "receive" && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
          <ReceiveTab
            supplierId={id}
            supplierName={supplier.name}
            onSuccess={() => setTab("purchases")}
          />
        </div>
      )}

      {/* ── Payments tab ──────────────────────────────────────────────────── */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPaymentForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showPaymentForm ? <X size={15} /> : <Plus size={15} />}
              {showPaymentForm ? "Cancel" : "Record Payment"}
            </button>
          </div>

          {showPaymentForm && (
            <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-primary-500/15 rounded-lg">
                  <CreditCard size={14} className="text-primary-400" />
                </div>
                <h3 className="font-semibold text-white">Record Payment</h3>
              </div>
              <form
                onSubmit={handlePaymentSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="space-y-1">
                  <label className="text-xs text-surface-400 font-medium">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        payment_date: e.target.value,
                      }))
                    }
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-surface-400 font-medium">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-surface-400 font-medium">
                    Method
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        payment_method: e.target.value,
                      }))
                    }
                    className={inputCls}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-surface-400 font-medium">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        reference: e.target.value,
                      }))
                    }
                    placeholder="Cheque no, M-Pesa ref..."
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-surface-400 font-medium">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional notes..."
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={createPayment.isPending}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {createPayment.isPending ? "Saving..." : "Save Payment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Payment History</h2>
              <span className="text-xs text-surface-400">
                {paymentsFrom || paymentsTo
                  ? `${filteredPayments.length} of ${payments.length}`
                  : payments.length}{" "}
                payment{payments.length !== 1 ? "s" : ""}
              </span>
            </div>

            <DateFilter
              from={paymentsFrom}
              setFrom={setPaymentsFrom}
              to={paymentsTo}
              setTo={setPaymentsTo}
              onClear={() => {
                setPaymentsFrom("");
                setPaymentsTo("");
                setPaymentsPage(1);
              }}
            />

            {paymentsLoading ? (
              <div className="py-12 text-center text-surface-400">
                Loading...
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-surface-500">
                <CreditCard
                  size={32}
                  className="mx-auto mb-2 text-surface-700"
                />
                <p>
                  {payments.length === 0
                    ? "No payments recorded yet."
                    : "No payments match the selected date range."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-700 bg-surface-800/30">
                        <th className="text-left px-4 py-3 text-surface-400 font-medium">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 text-surface-400 font-medium">
                          Method
                        </th>
                        <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">
                          Reference
                        </th>
                        <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">
                          Notes
                        </th>
                        <th className="text-right px-4 py-3 text-surface-400 font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700/40">
                      {pmPageItems.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-surface-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-surface-300">
                            {fmtDate(p.payment_date)}
                          </td>
                          <td className="px-4 py-3 text-surface-300 capitalize">
                            {p.payment_method}
                          </td>
                          <td className="px-4 py-3 text-surface-400 font-mono text-xs hidden md:table-cell">
                            {p.reference || "—"}
                          </td>
                          <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">
                            {p.notes || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-400">
                            {fmt(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <MobileCardList>
                  {pmPageItems.map((p) => (
                    <MobileCard key={p.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-surface-300 text-sm">
                          {fmtDate(p.payment_date)}
                        </span>
                        <span className="text-green-400 font-medium text-sm">
                          {fmt(p.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-surface-300 capitalize">
                          {p.payment_method}
                        </span>
                        {p.reference && (
                          <span className="font-mono text-surface-400">
                            {p.reference}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <div className="text-xs text-surface-400">
                          {p.notes}
                        </div>
                      )}
                    </MobileCard>
                  ))}
                </MobileCardList>

                <PaginationBar
                  page={pmSafePage}
                  totalPages={pmTotalPages}
                  setPage={setPaymentsPage}
                  left={
                    <span>
                      {paymentsFrom || paymentsTo ? "Period" : "Total"} Paid:{" "}
                      <span className="text-green-400 font-bold">
                        {fmt(pmFilteredTotal)}
                      </span>
                    </span>
                  }
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Statement tab ─────────────────────────────────────────────────── */}
      {tab === "statement" && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Supplier Statement</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400 mr-2">
                {statement.length} transaction
                {statement.length !== 1 ? "s" : ""}
              </span>
              {statement.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      exportSupplierStatementCsv(
                        id,
                        stmtFrom || undefined,
                        stmtTo || undefined,
                      ).catch(() => toast.error("Export failed"))
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-xs rounded-lg transition-colors"
                    title="Download as Excel/CSV"
                  >
                    <Download size={13} /> Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-xs rounded-lg transition-colors"
                    title="Print / Save as PDF"
                  >
                    <Printer size={13} /> PDF
                  </button>
                </>
              )}
            </div>
          </div>

          <DateFilter
            from={stmtFrom}
            setFrom={setStmtFrom}
            to={stmtTo}
            setTo={setStmtTo}
            onClear={() => {
              setStmtFrom("");
              setStmtTo("");
              setStmtPage(1);
            }}
          />

          {statementLoading ? (
            <div className="py-12 text-center text-surface-400">
              Loading statement...
            </div>
          ) : statement.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <FileText size={32} className="mx-auto mb-2 text-surface-700" />
              <p>
                {stmtFrom || stmtTo
                  ? "No transactions in the selected date range."
                  : "No transactions for this supplier yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/30">
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">
                        Reference
                      </th>
                      <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">
                        Description
                      </th>
                      <th className="text-right px-4 py-3 text-surface-400 font-medium">
                        Debit
                      </th>
                      <th className="text-right px-4 py-3 text-surface-400 font-medium">
                        Credit
                      </th>
                      <th className="text-right px-4 py-3 text-surface-400 font-medium">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {stmtPageItems.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-surface-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-surface-300">
                          {fmtDate(row.txn_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              TXN_TYPE_STYLES[row.txn_type] ||
                              "bg-surface-700 text-surface-400"
                            }`}
                          >
                            {row.txn_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-surface-400 font-mono text-xs hidden sm:table-cell">
                          {row.reference}
                        </td>
                        <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                          {row.description}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400">
                          {Number(row.debit) > 0 ? fmt(row.debit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400">
                          {Number(row.credit) > 0 ? fmt(row.credit) : "—"}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            Number(row.running_balance) > 0
                              ? "text-red-400"
                              : Number(row.running_balance) < 0
                                ? "text-green-400"
                                : "text-surface-300"
                          }`}
                        >
                          {fmt(Math.abs(row.running_balance))}
                          {Number(row.running_balance) > 0
                            ? " DR"
                            : Number(row.running_balance) < 0
                              ? " CR"
                              : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-800/50 font-semibold border-t border-surface-600">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right text-xs text-surface-400 uppercase tracking-wide"
                      >
                        {stmtFrom || stmtTo ? "Period" : "Closing"} Balance
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {fmt(
                          statement.reduce(
                            (s, r) => s + Number(r.debit ?? 0),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {fmt(
                          statement.reduce(
                            (s, r) => s + Number(r.credit ?? 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${
                          balance > 0
                            ? "text-red-400"
                            : balance < 0
                              ? "text-green-400"
                              : "text-surface-300"
                        }`}
                      >
                        {fmt(Math.abs(balance))}{" "}
                        {balance > 0 ? "DR" : balance < 0 ? "CR" : ""}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <MobileCardList>
                {stmtPageItems.map((row, i) => (
                  <MobileCard key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-surface-300 text-sm">
                        {fmtDate(row.txn_date)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TXN_TYPE_STYLES[row.txn_type] || "bg-surface-700 text-surface-400"}`}
                      >
                        {row.txn_type}
                      </span>
                    </div>
                    {row.reference && (
                      <div className="font-mono text-xs text-surface-400">
                        {row.reference}
                      </div>
                    )}
                    {row.description && (
                      <div className="text-xs text-surface-400">
                        {row.description}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-x-3">
                        {Number(row.debit) > 0 && (
                          <span className="text-red-400">
                            Dr {fmt(row.debit)}
                          </span>
                        )}
                        {Number(row.credit) > 0 && (
                          <span className="text-green-400">
                            Cr {fmt(row.credit)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-medium ${Number(row.running_balance) > 0 ? "text-red-400" : Number(row.running_balance) < 0 ? "text-green-400" : "text-surface-300"}`}
                      >
                        {fmt(Math.abs(row.running_balance))}
                        {Number(row.running_balance) > 0
                          ? " DR"
                          : Number(row.running_balance) < 0
                            ? " CR"
                            : ""}
                      </span>
                    </div>
                  </MobileCard>
                ))}
                <MobileCard className="bg-surface-900/50!">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-400 uppercase tracking-wide">
                      {stmtFrom || stmtTo ? "Period" : "Closing"} Balance
                    </span>
                    <span
                      className={`font-semibold ${balance > 0 ? "text-red-400" : balance < 0 ? "text-green-400" : "text-surface-300"}`}
                    >
                      {fmt(Math.abs(balance))}{" "}
                      {balance > 0 ? "DR" : balance < 0 ? "CR" : ""}
                    </span>
                  </div>
                </MobileCard>
              </MobileCardList>

              <PaginationBar
                page={stmtSafePage}
                totalPages={stmtTotalPages}
                setPage={setStmtPage}
                left={
                  <span className="text-xs text-surface-400">
                    {(stmtSafePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(stmtSafePage * PAGE_SIZE, statement.length)} of{" "}
                    {statement.length} transactions
                  </span>
                }
              />
            </>
          )}
        </div>
      )}

      {/* ── Pay tab ─────────────────────────────────────────────────────── */}
      {tab === "pay" && (
        <div className="space-y-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary-500/15 rounded-lg">
                <Banknote size={14} className="text-primary-400" />
              </div>
              <h3 className="font-semibold text-white">
                Pay Supplier Invoices
              </h3>
            </div>

            {/* Bank account + date + ref */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Bank Account *
                </label>
                <select
                  className={inputCls}
                  value={payBankAccountId}
                  onChange={(e) => setPayBankAccountId(e.target.value)}
                >
                  <option value="">Select bank account…</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Payment Date *
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">
                  Reference
                </label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Cheque no, transfer ref…"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>
            </div>

            {/* Invoices table */}
            {unpaidLoading ? (
              <div className="py-8 text-center text-surface-400">
                Loading invoices...
              </div>
            ) : unpaidInvoices.length === 0 ? (
              <div className="py-8 text-center text-surface-500">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-2 text-green-500/40"
                />
                <p>No outstanding invoices for this supplier.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-700 bg-surface-800/30">
                        <th className="text-left px-4 py-3 text-surface-400 font-medium">
                          Invoice #
                        </th>
                        <th className="text-left px-4 py-3 text-surface-400 font-medium">
                          Date
                        </th>
                        <th className="text-right px-4 py-3 text-surface-400 font-medium">
                          Invoice Amount
                        </th>
                        <th className="text-right px-4 py-3 text-surface-400 font-medium">
                          Paid
                        </th>
                        <th className="text-right px-4 py-3 text-surface-400 font-medium">
                          Outstanding
                        </th>
                        <th className="text-right px-4 py-3 text-surface-400 font-medium w-36">
                          Pay Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700/40">
                      {unpaidInvoices.map((inv) => {
                        const outstanding =
                          Number(inv.total_amount) -
                          Number(inv.amount_paid || 0);
                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-surface-700/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-primary-400">
                              {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-surface-300">
                              {fmtDate(inv.purchase_date)}
                            </td>
                            <td className="px-4 py-3 text-right text-white">
                              {fmt(inv.total_amount)}
                            </td>
                            <td className="px-4 py-3 text-right text-green-400">
                              {fmt(inv.amount_paid || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-400 font-medium">
                              {fmt(outstanding)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                max={outstanding}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={payAllocations[inv.id] || ""}
                                onChange={(e) =>
                                  handlePayAllocation(inv.id, e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-800/50 border-t border-surface-600">
                        <td
                          colSpan={5}
                          className="px-4 py-3 text-right text-sm font-semibold text-surface-300"
                        >
                          Total Payment
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-white">
                          {fmt(payTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Journal preview */}
                {payTotal > 0 && payBankAccountId && (
                  <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                    <p className="text-surface-400 mb-2 font-medium">
                      Journal Entry Preview
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-white">
                          Dr {supplier?.name || "Accounts Payable"}
                        </span>
                        <span className="text-emerald-400">
                          {fmt(payTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-white">
                          Cr{" "}
                          {bankAccounts.find((a) => a.id === payBankAccountId)
                            ?.name || "Bank"}
                        </span>
                        <span className="text-red-400">{fmt(payTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handlePaySubmit}
                    disabled={
                      paySubmitting || payTotal <= 0 || !payBankAccountId
                    }
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Banknote size={15} />
                    {paySubmitting ? "Processing…" : `Pay ${fmt(payTotal)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetailPage;

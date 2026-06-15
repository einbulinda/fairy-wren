import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@/services/accounts.service";
import { useCheques, useCreateCheque, useClearCheque, useVoidCheque } from "@/hooks/useCheques";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAccountClasses } from "@/hooks/useAccountClasses";
import {
  Plus, Trash2, CheckCircle, XCircle, Clock, Receipt, ArrowLeftRight,
  X, ChevronLeft, ChevronRight, Building2, Landmark,
} from "lucide-react";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import { fmt, localDateStr } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const today = localDateStr();

const STATUS_STYLES = {
  issued:  { label: "Issued",  icon: Clock,        cls: "bg-primary-500/15 text-primary-300" },
  cleared: { label: "Cleared", icon: CheckCircle,  cls: "bg-emerald-500/15 text-emerald-400" },
  voided:  { label: "Voided",  icon: XCircle,      cls: "bg-red-500/15 text-red-400" },
};

const EMPTY_BANK_FORM = {
  reference: "",
  cheque_date: today,
  amount: "",
  memo: "",
  payee_category: "supplier",
  payee_id: "",
  payee_name: "",
  debit_account_id: "",
  expense_lines: [{ account_id: "", amount: "" }],
};

const EMPTY_TRANSFER_FORM = {
  reference: "",
  cheque_date: today,
  amount: "",
  from_account_id: "",
  to_account_id: "",
  memo: "",
};

const PAGE_SIZE = 10;

const ChequeWritingPage = () => {
  // "transfer" or a bank account id
  const [activeTab, setActiveTab] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_BANK_FORM);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: suppliers = [] } = useSuppliers({ active: true });
  const { data: accountClasses = [] } = useAccountClasses();

  const filters = useMemo(() => {
    const f = {};
    if (filterStatus) f.status = filterStatus;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    return f;
  }, [filterStatus, filterFrom, filterTo]);

  const { data: cheques = [], isLoading } = useCheques(filters);
  const createMutation = useCreateCheque();
  const clearMutation = useClearCheque();
  const voidMutation = useVoidCheque();

  // Leaf bank accounts (have a parent — not header accounts)
  const leafBankAccounts = useMemo(() => {
    const all = accounts.filter((a) => a.account_class === "bank" && a.active);
    const leaves = all.filter((a) => a.parent_id !== null);
    return leaves.length > 0 ? leaves : all; // fallback if flat chart
  }, [accounts]);

  // Expense accounts: all accounts whose class has category === "expense"
  // Prefer leaf accounts (parent_id !== null) but fall back to all if chart is flat
  const expenseClassCodes = useMemo(
    () => new Set(accountClasses.filter((c) => c.category === "expense").map((c) => c.code)),
    [accountClasses],
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((a) => expenseClassCodes.has(a.account_class) && a.active),
    [accounts, expenseClassCodes],
  );

  // Transfer to accounts (exclude from account)
  const transferToAccounts = leafBankAccounts.filter(
    (a) => a.id !== transferForm.from_account_id,
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(cheques.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = cheques.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Stats
  const issuedTotal  = cheques.filter((c) => c.status === "issued").reduce((s, c) => s + Number(c.amount), 0);
  const clearedTotal = cheques.filter((c) => c.status === "cleared").reduce((s, c) => s + Number(c.amount), 0);

  // ── Derived form values ───────────────────────────────────────────────────
  const isTransferTab = activeTab === "transfer";
  const selectedBank = leafBankAccounts.find((a) => a.id === activeTab);

  const chequeAmount = parseFloat(form.amount) || 0;
  const expenseTotal = form.expense_lines.reduce(
    (s, l) => s + (parseFloat(l.amount) || 0),
    0,
  );
  const expenseRemaining = chequeAmount - expenseTotal;
  const expensesValid =
    form.expense_lines.filter((l) => l.account_id && parseFloat(l.amount) > 0).length > 0 &&
    Math.round(expenseRemaining * 100) === 0;

  // Journal preview accounts for bank payment
  const previewBankAcc = selectedBank;
  const previewDebitAcc = accounts.find((a) => a.id === form.debit_account_id);
  const previewFromAcc = leafBankAccounts.find((a) => a.id === transferForm.from_account_id);
  const previewToAcc = leafBankAccounts.find((a) => a.id === transferForm.to_account_id);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openTab = (tabId) => {
    setActiveTab(tabId);
    setShowForm(true);
    setForm(EMPTY_BANK_FORM);
    setTransferForm(EMPTY_TRANSFER_FORM);
  };

  const closeForm = () => {
    setShowForm(false);
    setActiveTab(null);
    setForm(EMPTY_BANK_FORM);
    setTransferForm(EMPTY_TRANSFER_FORM);
  };

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handlePayeeCategoryChange = (cat) => {
    setForm({
      ...form,
      payee_category: cat,
      payee_id: "",
      payee_name: "",
      debit_account_id: "",
      expense_lines: [{ account_id: "", amount: "" }],
    });
  };

  const handleSupplierSelect = (id) => {
    const s = suppliers.find((x) => x.id === id);
    setForm({ ...form, payee_id: id, payee_name: s?.name || "", debit_account_id: s?.account_id || "" });
  };

  // Expense line handlers
  const updateExpenseLine = (idx, key, value) => {
    const lines = form.expense_lines.map((l, i) =>
      i === idx ? { ...l, [key]: value } : l,
    );
    setForm({ ...form, expense_lines: lines });
  };

  const addExpenseLine = () => {
    setForm({ ...form, expense_lines: [...form.expense_lines, { account_id: "", amount: "" }] });
  };

  const removeExpenseLine = (idx) => {
    if (form.expense_lines.length === 1) return;
    setForm({ ...form, expense_lines: form.expense_lines.filter((_, i) => i !== idx) });
  };

  // Used expense account ids (to prevent duplicates)
  const usedExpenseAccounts = new Set(form.expense_lines.map((l) => l.account_id).filter(Boolean));

  const handleBankSubmit = () => {
    const payload = {
      transaction_type: "bank_cheque",
      cheque_number: form.reference,
      bank_account_id: activeTab,
      cheque_date: form.cheque_date,
      amount: chequeAmount,
      memo: form.memo,
    };

    if (form.payee_category === "supplier") {
      Object.assign(payload, {
        payee_type: "supplier",
        payee_id: form.payee_id,
        payee_name: form.payee_name,
        debit_account_id: form.debit_account_id,
      });
    } else {
      Object.assign(payload, {
        payee_type: "expense",
        payee_name: form.memo || "Expense Payment",
        debit_account_id: null,
        expense_lines: form.expense_lines
          .filter((l) => l.account_id && parseFloat(l.amount) > 0)
          .map((l) => ({ account_id: l.account_id, amount: parseFloat(l.amount) })),
      });
    }

    createMutation.mutate(payload, { onSuccess: closeForm });
  };

  const handleTransferSubmit = () => {
    createMutation.mutate(
      {
        transaction_type: "transfer",
        cheque_number: transferForm.reference,
        bank_account_id: transferForm.from_account_id,
        debit_account_id: transferForm.to_account_id,
        payee_type: "other",
        payee_name: "Internal Transfer",
        amount: parseFloat(transferForm.amount),
        cheque_date: transferForm.cheque_date,
        memo: transferForm.memo,
      },
      { onSuccess: closeForm },
    );
  };

  const handleClear = (id, ref) => {
    if (!confirm(`Mark ${ref} as cleared?`)) return;
    clearMutation.mutate(id);
  };

  const handleVoid = (id, ref) => {
    if (!confirm(`Void ${ref}? A reversing journal entry will be created.`)) return;
    voidMutation.mutate(id);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const bankSubmitDisabled =
    createMutation.isPending ||
    !form.reference ||
    !form.cheque_date ||
    chequeAmount <= 0 ||
    (form.payee_category === "supplier" && (!form.payee_id || !form.debit_account_id)) ||
    (form.payee_category === "expense" && !expensesValid);

  const transferSubmitDisabled =
    createMutation.isPending ||
    !transferForm.reference ||
    !transferForm.cheque_date ||
    !(parseFloat(transferForm.amount) > 0) ||
    !transferForm.from_account_id ||
    !transferForm.to_account_id;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Issued (Outstanding)</p>
          <p className="text-xl font-bold text-primary-400">{fmt(issuedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "issued").length} records</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Cleared</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(clearedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "cleared").length} records</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Total Records</p>
          <p className="text-xl font-bold text-white">{cheques.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "voided").length} voided</p>
        </div>
      </div>

      {/* Bank account tabs + Transfer */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-0 border-b border-surface-700">
          <p className="text-xs text-surface-500 uppercase tracking-wider mb-2 font-medium">Issue Payment From</p>
          <div className="flex flex-wrap gap-2 pb-0">
            {leafBankAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => openTab(acc.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === acc.id
                    ? "border-primary-500 text-primary-400 bg-surface-700/40"
                    : "border-transparent text-surface-400 hover:text-white hover:bg-surface-700/30"
                }`}
              >
                <Landmark size={14} />
                {acc.name}
              </button>
            ))}
            <button
              onClick={() => openTab("transfer")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === "transfer"
                  ? "border-amber-500 text-amber-400 bg-surface-700/40"
                  : "border-transparent text-surface-400 hover:text-white hover:bg-surface-700/30"
              }`}
            >
              <ArrowLeftRight size={14} />
              Transfer
            </button>
          </div>
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                {isTransferTab
                  ? <><ArrowLeftRight size={16} className="text-amber-400" /> Fund Transfer</>
                  : <><Building2 size={16} className="text-primary-400" /> {selectedBank?.name}</>}
              </h2>
              <button onClick={closeForm} className="text-surface-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* ── Transfer form ── */}
            {isTransferTab ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Transfer Ref *</label>
                    <input className={inputCls} placeholder="TRF-001"
                      value={transferForm.reference}
                      onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Date *</label>
                    <input type="date" className={inputCls} value={transferForm.cheque_date}
                      onChange={(e) => setTransferForm({ ...transferForm, cheque_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Amount *</label>
                    <input type="number" min="0.01" step="0.01" className={inputCls} placeholder="0.00"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">From Account *</label>
                    <select className={inputCls} value={transferForm.from_account_id}
                      onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value, to_account_id: "" })}>
                      <option value="">Select account…</option>
                      {leafBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">To Account *</label>
                    <select className={inputCls} value={transferForm.to_account_id}
                      onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}>
                      <option value="">Select account…</option>
                      {transferToAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Memo</label>
                    <input className={inputCls} placeholder="Purpose of transfer…"
                      value={transferForm.memo}
                      onChange={(e) => setTransferForm({ ...transferForm, memo: e.target.value })} />
                  </div>
                </div>

                {/* Journal preview */}
                {parseFloat(transferForm.amount) > 0 && transferForm.from_account_id && transferForm.to_account_id && (
                  <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                    <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-white">Dr {previewToAcc?.name || "To Account"}</span>
                        <span className="text-emerald-400">{fmt(parseFloat(transferForm.amount))}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-white">Cr {previewFromAcc?.name || "From Account"}</span>
                        <span className="text-red-400">{fmt(parseFloat(transferForm.amount))}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={closeForm}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleTransferSubmit} disabled={transferSubmitDisabled}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
                    <ArrowLeftRight size={15} />
                    {createMutation.isPending ? "Saving…" : "Record Transfer"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Bank payment form ── */
              <div className="space-y-4">
                {/* Header fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Cheque Number *</label>
                    <input className={inputCls} placeholder="001"
                      value={form.reference} onChange={setField("reference")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Date *</label>
                    <input type="date" className={inputCls} value={form.cheque_date}
                      onChange={setField("cheque_date")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-surface-400 font-medium">Amount *</label>
                    <input type="number" min="0.01" step="0.01" className={inputCls} placeholder="0.00"
                      value={form.amount} onChange={setField("amount")} />
                  </div>
                </div>

                {/* Payment type sub-tabs */}
                <div>
                  <div className="flex rounded-lg border border-surface-600 bg-surface-900 p-0.5 gap-0.5 w-fit">
                    {[
                      { value: "supplier", label: "Supplier Payment" },
                      { value: "expense", label: "Expense" },
                    ].map((t) => (
                      <button key={t.value} type="button"
                        onClick={() => handlePayeeCategoryChange(t.value)}
                        className={`py-1.5 px-4 rounded-md text-sm font-medium transition-colors ${
                          form.payee_category === t.value
                            ? "bg-primary-600 text-white"
                            : "text-surface-400 hover:text-white"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Supplier fields */}
                {form.payee_category === "supplier" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400 font-medium">Supplier *</label>
                      <select className={inputCls} value={form.payee_id}
                        onChange={(e) => handleSupplierSelect(e.target.value)}>
                        <option value="">Select supplier…</option>
                        {suppliers.filter((s) => s.active).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400 font-medium">Trade Payables Account</label>
                      <input className={inputCls}
                        value={previewDebitAcc?.name || (form.payee_id ? "—" : "Select supplier first")}
                        disabled />
                      <p className="text-[10px] text-surface-500">Auto-set from supplier's accounts payable</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-surface-400 font-medium">Memo</label>
                      <input className={inputCls} placeholder="Payment purpose…"
                        value={form.memo} onChange={setField("memo")} />
                    </div>
                  </div>
                )}

                {/* Expense fields */}
                {form.payee_category === "expense" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400 font-medium">Memo / Description</label>
                      <input className={inputCls} placeholder="Purpose of payment…"
                        value={form.memo} onChange={setField("memo")} />
                    </div>

                    <div>
                      <label className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-2 block">Expense Lines</label>

                      <div className="space-y-2">
                        {form.expense_lines.map((line, idx) => (
                          <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                            <select
                              className={`${inputCls} col-span-3`}
                              value={line.account_id}
                              onChange={(e) => updateExpenseLine(idx, "account_id", e.target.value)}
                            >
                              <option value="">Select expense account…</option>
                              {expenseAccounts.map((a) => (
                                <option
                                  key={a.id}
                                  value={a.id}
                                  disabled={usedExpenseAccounts.has(a.id) && a.id !== line.account_id}
                                >
                                  {a.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-1 items-center">
                              <input
                                type="number" min="0.01" step="0.01"
                                className={`${inputCls} min-w-0 flex-1`}
                                placeholder="0.00"
                                value={line.amount}
                                onChange={(e) => updateExpenseLine(idx, "amount", e.target.value)}
                              />
                              <button type="button" onClick={() => removeExpenseLine(idx)}
                                disabled={form.expense_lines.length === 1}
                                className="text-surface-500 hover:text-red-400 disabled:opacity-30 transition-colors shrink-0"
                                title="Remove line">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button type="button" onClick={addExpenseLine}
                        className="mt-2 flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        <Plus size={13} /> Add Line
                      </button>

                      {/* Allocation summary */}
                      {chequeAmount > 0 && (
                        <div className={`mt-2 flex items-center justify-between text-xs px-1 ${
                          expenseRemaining < 0 ? "text-red-400" : "text-surface-400"
                        }`}>
                          <span>Total allocated: {fmt(expenseTotal)}</span>
                          <span className={expenseRemaining < 0 ? "text-red-400" : expenseRemaining === 0 ? "text-emerald-400" : "text-surface-400"}>
                            {expenseRemaining < 0
                              ? `Over by ${fmt(Math.abs(expenseRemaining))}`
                              : expenseRemaining === 0
                                ? "Fully allocated"
                                : `${fmt(expenseRemaining)} remaining`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Journal preview */}
                {chequeAmount > 0 && activeTab && (
                  form.payee_category === "supplier" && form.debit_account_id ? (
                    <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                      <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-white">Dr {previewDebitAcc?.name || "Trade Payables"}</span>
                          <span className="text-emerald-400">{fmt(chequeAmount)}</span>
                        </div>
                        <div className="flex justify-between pl-4">
                          <span className="text-white">Cr {previewBankAcc?.name || "Bank"}</span>
                          <span className="text-red-400">{fmt(chequeAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ) : form.payee_category === "expense" && expensesValid ? (
                    <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                      <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                      <div className="space-y-1">
                        {form.expense_lines
                          .filter((l) => l.account_id && parseFloat(l.amount) > 0)
                          .map((l, i) => {
                            const acc = accounts.find((a) => a.id === l.account_id);
                            return (
                              <div key={i} className="flex justify-between">
                                <span className="text-white">Dr {acc?.name || "Expense Account"}</span>
                                <span className="text-emerald-400">{fmt(parseFloat(l.amount))}</span>
                              </div>
                            );
                          })}
                        <div className="flex justify-between pl-4 border-t border-surface-700/40 pt-1 mt-1">
                          <span className="text-white">Cr {previewBankAcc?.name || "Bank"}</span>
                          <span className="text-red-400">{fmt(chequeAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={closeForm}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleBankSubmit} disabled={bankSubmitDisabled}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
                    <Receipt size={15} />
                    {createMutation.isPending ? "Saving…" : "Issue Cheque"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment register */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-white mr-auto">Payment Register</h2>
          <select className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="issued">Issued</option>
            <option value="cleared">Cleared</option>
            <option value="voided">Voided</option>
          </select>
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cheques.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
            <p>No records found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Payee / Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">From Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {pageItems.map((c) => {
                    const s = STATUS_STYLES[c.status] || STATUS_STYLES.issued;
                    const Icon = s.icon;
                    const typeLabel = c.transaction_type === "transfer"
                      ? "Transfer"
                      : c.payee_type === "expense"
                        ? "Expense"
                        : c.payee_type === "supplier"
                          ? "Supplier"
                          : "Payment";
                    return (
                      <tr key={c.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-white">{c.cheque_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{c.payee_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-surface-500">{typeLabel}</span>
                            {c.memo && <span className="text-xs text-surface-600">{c.memo}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-surface-300">{c.bank_account?.name || "—"}</td>
                        <td className="px-4 py-3 text-surface-300">
                          {new Date(c.cheque_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{fmt(c.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                            <Icon size={11} /> {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {c.status === "issued" && (
                              <>
                                <button onClick={() => handleClear(c.id, c.cheque_number)}
                                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                                  <CheckCircle size={12} /> Clear
                                </button>
                                <button onClick={() => handleVoid(c.id, c.cheque_number)}
                                  className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                                  <XCircle size={12} /> Void
                                </button>
                              </>
                            )}
                            {c.status === "cleared" && (
                              <button onClick={() => handleVoid(c.id, c.cheque_number)}
                                className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                                <XCircle size={12} /> Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <MobileCardList>
              {pageItems.map((c) => {
                const s = STATUS_STYLES[c.status] || STATUS_STYLES.issued;
                const Icon = s.icon;
                const typeLabel = c.transaction_type === "transfer" ? "Transfer"
                  : c.payee_type === "expense" ? "Expense"
                  : c.payee_type === "supplier" ? "Supplier" : "Payment";
                return (
                  <MobileCard key={c.id}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white text-sm">{c.cheque_number}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        <Icon size={11} /> {s.label}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm">{c.payee_name}</p>
                    <div className="text-xs text-surface-500">
                      {typeLabel}
                      {c.memo && <span className="text-surface-600 ml-2">{c.memo}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold tabular-nums">{fmt(c.amount)}</span>
                      <span className="text-surface-400 text-xs">
                        {new Date(c.cheque_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                      </span>
                    </div>
                    <MobileField label="From">{c.bank_account?.name || "—"}</MobileField>
                    {(c.status === "issued" || c.status === "cleared") && (
                      <div className="flex gap-1.5 pt-1">
                        {c.status === "issued" && (
                          <button onClick={() => handleClear(c.id, c.cheque_number)}
                            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                            <CheckCircle size={12} /> Clear
                          </button>
                        )}
                        <button onClick={() => handleVoid(c.id, c.cheque_number)}
                          className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                          <XCircle size={12} /> Void
                        </button>
                      </div>
                    )}
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, cheques.length)} of {cheques.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs text-surface-400">{safePage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
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

export default ChequeWritingPage;

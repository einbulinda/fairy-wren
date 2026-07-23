import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts, fetchAccountLedger } from "@/services/accounts.service";
import { useCheques, useCreateCheque } from "@/hooks/useCheques";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAccountClasses } from "@/hooks/useAccountClasses";
import { useProducts } from "@/hooks/useProducts";
import {
  Plus, Trash2, Receipt, ArrowLeftRight, Landmark, Package, X,
} from "lucide-react";
import { fmt, localDateStr } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const today = localDateStr();

const EMPTY_ITEM_LINE = { product_id: "", description: "", quantity: "", unit_cost: "", account_id: "" };
const EMPTY_EXPENSE_LINE = { account_id: "", amount: "", description: "" };

const EMPTY_BANK_FORM = {
  reference: "",
  cheque_date: today,
  amount: "",
  memo: "",
  payee_id: "",
  payee_name: "",
  debit_account_id: "",
  expense_lines: [{ ...EMPTY_EXPENSE_LINE }],
  item_lines: [{ ...EMPTY_ITEM_LINE }],
};

const EMPTY_TRANSFER_FORM = {
  reference: "",
  cheque_date: today,
  amount: "",
  to_account_id: "",
  memo: "",
};

const PAYEE_CATEGORIES = [
  { value: "supplier", label: "Supplier Payment" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

const ChequeWritingPage = () => {
  const [bankAccountId, setBankAccountId] = useState("");
  const [payeeCategory, setPayeeCategory] = useState("supplier");
  const [form, setForm] = useState(EMPTY_BANK_FORM);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
  const [lineTab, setLineTab] = useState("expenses");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: suppliers = [] } = useSuppliers({ active: true });
  const { data: accountClasses = [] } = useAccountClasses();
  const { data: products = [] } = useProducts({ active: true });

  const { data: cheques = [] } = useCheques();
  const createMutation = useCreateCheque();

  // Leaf bank accounts (have a parent — not header accounts)
  const leafBankAccounts = useMemo(() => {
    const all = accounts.filter((a) => a.account_class === "bank" && a.active);
    const leaves = all.filter((a) => a.parent_id !== null);
    return leaves.length > 0 ? leaves : all; // fallback if flat chart
  }, [accounts]);

  // The account being credited — shared by Supplier / Expense / Transfer
  const selectedBankId = bankAccountId || leafBankAccounts[0]?.id || "";
  const selectedBank = leafBankAccounts.find((a) => a.id === selectedBankId);

  // Ending balance for the selected bank account (full ledger history, last running balance)
  const { data: bankLedger = [] } = useQuery({
    queryKey: ["account-balance", selectedBankId],
    queryFn: () => fetchAccountLedger(selectedBankId),
    enabled: !!selectedBankId,
    staleTime: 30 * 1000,
  });
  const endingBalance = bankLedger.length ? Number(bankLedger[bankLedger.length - 1].running_balance) : 0;

  // Expense accounts: all accounts whose class has category === "expense"
  const expenseClassCodes = useMemo(
    () => new Set(accountClasses.filter((c) => c.category === "expense").map((c) => c.code)),
    [accountClasses],
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((a) => expenseClassCodes.has(a.account_class) && a.active),
    [accounts, expenseClassCodes],
  );

  // Transfer "to" accounts (exclude the selected bank/from account)
  const transferToAccounts = leafBankAccounts.filter((a) => a.id !== selectedBankId);

  // Stats
  const issuedTotal  = cheques.filter((c) => c.status === "issued").reduce((s, c) => s + Number(c.amount), 0);
  const clearedTotal = cheques.filter((c) => c.status === "cleared").reduce((s, c) => s + Number(c.amount), 0);

  // ── Derived form values ───────────────────────────────────────────────────
  const isTransfer = payeeCategory === "transfer";
  const isSupplier = payeeCategory === "supplier";
  const isExpense = payeeCategory === "expense";

  const chequeAmount = parseFloat(form.amount) || 0;
  const expenseTotal = form.expense_lines.reduce(
    (s, l) => s + (parseFloat(l.amount) || 0),
    0,
  );
  const itemTotal = form.item_lines.reduce(
    (s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0),
    0,
  );
  const combinedTotal = expenseTotal + itemTotal;
  const combinedRemaining = chequeAmount - combinedTotal;
  const expensesValid =
    (form.expense_lines.some((l) => l.account_id && parseFloat(l.amount) > 0) ||
     form.item_lines.some((l) => l.account_id && parseFloat(l.quantity) > 0 && parseFloat(l.unit_cost) > 0)) &&
    Math.round(combinedRemaining * 100) === 0;

  // Journal preview accounts
  const previewDebitAcc = accounts.find((a) => a.id === form.debit_account_id);
  const previewToAcc = leafBankAccounts.find((a) => a.id === transferForm.to_account_id);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePayeeCategoryChange = (cat) => {
    setPayeeCategory(cat);
    setForm(EMPTY_BANK_FORM);
    setTransferForm(EMPTY_TRANSFER_FORM);
    setLineTab("expenses");
  };

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
    setForm({ ...form, expense_lines: [...form.expense_lines, { ...EMPTY_EXPENSE_LINE }] });
  };

  const removeExpenseLine = (idx) => {
    if (form.expense_lines.length === 1) return;
    setForm({ ...form, expense_lines: form.expense_lines.filter((_, i) => i !== idx) });
  };

  // Used expense account ids (to prevent duplicates)
  const usedExpenseAccounts = new Set(form.expense_lines.map((l) => l.account_id).filter(Boolean));

  // Item line handlers
  const updateItemLine = (idx, key, value) => {
    const lines = form.item_lines.map((l, i) => i === idx ? { ...l, [key]: value } : l);
    setForm({ ...form, item_lines: lines });
  };

  const handleItemProductSelect = (idx, productId) => {
    const product = products.find((p) => p.id === productId);
    const lines = form.item_lines.map((l, i) =>
      i === idx ? {
        ...l,
        product_id: productId,
        description: product?.name || "",
        unit_cost: product?.cost_price != null ? String(product.cost_price) : "",
      } : l,
    );
    setForm({ ...form, item_lines: lines });
  };

  const addItemLine = () => {
    setForm({ ...form, item_lines: [...form.item_lines, { ...EMPTY_ITEM_LINE }] });
  };

  const removeItemLine = (idx) => {
    if (form.item_lines.length === 1) return;
    setForm({ ...form, item_lines: form.item_lines.filter((_, i) => i !== idx) });
  };

  const handleBankSubmit = (mode) => {
    const payload = {
      transaction_type: "bank_cheque",
      cheque_number: form.reference,
      bank_account_id: selectedBankId,
      cheque_date: form.cheque_date,
      amount: chequeAmount,
      memo: form.memo,
    };

    if (isSupplier) {
      Object.assign(payload, {
        payee_type: "supplier",
        payee_id: form.payee_id,
        payee_name: form.payee_name,
        debit_account_id: form.debit_account_id,
      });
    } else {
      const expLines = form.expense_lines
        .filter((l) => l.account_id && parseFloat(l.amount) > 0)
        .map((l) => ({ account_id: l.account_id, amount: parseFloat(l.amount), description: l.description?.trim() || null }));
      const itemLines = form.item_lines
        .filter((l) => l.account_id && parseFloat(l.quantity) > 0 && parseFloat(l.unit_cost) > 0)
        .map((l) => ({
          account_id: l.account_id,
          amount: parseFloat(l.quantity) * parseFloat(l.unit_cost),
        }));
      Object.assign(payload, {
        payee_type: "expense",
        payee_name: form.memo || "Expense Payment",
        debit_account_id: null,
        expense_lines: [...expLines, ...itemLines],
      });
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setForm(EMPTY_BANK_FORM);
        if (mode === "close") setBankAccountId("");
      },
    });
  };

  const handleTransferSubmit = (mode) => {
    createMutation.mutate(
      {
        transaction_type: "transfer",
        cheque_number: transferForm.reference,
        bank_account_id: selectedBankId,
        debit_account_id: transferForm.to_account_id,
        payee_type: "other",
        payee_name: "Internal Transfer",
        amount: parseFloat(transferForm.amount),
        cheque_date: transferForm.cheque_date,
        memo: transferForm.memo,
      },
      {
        onSuccess: () => {
          setTransferForm(EMPTY_TRANSFER_FORM);
          if (mode === "close") setBankAccountId("");
        },
      },
    );
  };

  const clearCurrentForm = () => {
    if (isTransfer) setTransferForm(EMPTY_TRANSFER_FORM);
    else setForm(EMPTY_BANK_FORM);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const bankSubmitDisabled =
    createMutation.isPending ||
    !selectedBankId ||
    !form.reference ||
    !form.cheque_date ||
    chequeAmount <= 0 ||
    (isSupplier && (!form.payee_id || !form.debit_account_id)) ||
    (isExpense && !expensesValid);

  const transferSubmitDisabled =
    createMutation.isPending ||
    !selectedBankId ||
    !transferForm.reference ||
    !transferForm.cheque_date ||
    !(parseFloat(transferForm.amount) > 0) ||
    !transferForm.to_account_id;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white">Write Cheques</h1>
        <p className="text-sm text-surface-400 mt-0.5">Issue payments and record bank transactions</p>
      </div>

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

      {/* Check-face posting form */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {leafBankAccounts.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-amber-400">No bank accounts configured. Add bank accounts under Accounting to issue cheques.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Bank account + ending balance */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-surface-700">
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark size={12} /> Bank Account
                </label>
                <select
                  className={`${inputCls} sm:w-64`}
                  value={selectedBankId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  {leafBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Ending Balance</p>
                <p className="text-xl font-bold text-white tabular-nums">{fmt(endingBalance)}</p>
              </div>
            </div>

            {/* Payee category sub-tabs */}
            <div className="flex rounded-lg border border-surface-600 bg-surface-900 p-0.5 gap-0.5 w-fit">
              {PAYEE_CATEGORIES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => handlePayeeCategoryChange(t.value)}
                  className={`py-1.5 px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    payeeCategory === t.value
                      ? "bg-primary-600 text-white"
                      : "text-surface-400 hover:text-white"
                  }`}>
                  {t.value === "transfer" && <ArrowLeftRight size={13} />}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Check face */}
            <div className="rounded-lg border border-surface-600 bg-surface-900/40 p-4 space-y-4">
              {/* No. / Date / Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">No.</label>
                  <input className={inputCls} placeholder="001"
                    value={isTransfer ? transferForm.reference : form.reference}
                    onChange={(e) => isTransfer
                      ? setTransferForm({ ...transferForm, reference: e.target.value })
                      : setField("reference")(e)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">Date</label>
                  <input type="date" className={inputCls}
                    value={isTransfer ? transferForm.cheque_date : form.cheque_date}
                    onChange={(e) => isTransfer
                      ? setTransferForm({ ...transferForm, cheque_date: e.target.value })
                      : setField("cheque_date")(e)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">Amount</label>
                  <input type="number" min="0.01" step="0.01" className={`${inputCls} font-semibold`} placeholder="0.00"
                    value={isTransfer ? transferForm.amount : form.amount}
                    onChange={(e) => isTransfer
                      ? setTransferForm({ ...transferForm, amount: e.target.value })
                      : setField("amount")(e)} />
                </div>
              </div>

              {/* Pay to the order of */}
              <div className="space-y-1">
                <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">Pay to the Order Of</label>
                {isSupplier && (
                  <select className={inputCls} value={form.payee_id}
                    onChange={(e) => handleSupplierSelect(e.target.value)}>
                    <option value="">Select supplier…</option>
                    {suppliers.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
                {isExpense && (
                  <input className={inputCls} placeholder="Expense Payment"
                    value={form.memo} onChange={setField("memo")} />
                )}
                {isTransfer && (
                  <select className={inputCls} value={transferForm.to_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}>
                    <option value="">Select account…</option>
                    {transferToAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>

              {/* Supplier: trade payables readout */}
              {isSupplier && (
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">Trade Payables Account</label>
                  <input className={inputCls}
                    value={previewDebitAcc?.name || (form.payee_id ? "—" : "Select supplier first")}
                    disabled />
                </div>
              )}

              {/* Memo (Supplier / Transfer only — Expense already uses this line as payee above) */}
              {!isExpense && (
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider">Memo</label>
                  <input className={inputCls} placeholder={isTransfer ? "Purpose of transfer…" : "Payment purpose…"}
                    value={isTransfer ? transferForm.memo : form.memo}
                    onChange={(e) => isTransfer
                      ? setTransferForm({ ...transferForm, memo: e.target.value })
                      : setField("memo")(e)} />
                </div>
              )}
            </div>

            {/* Expense line-item grid */}
            {isExpense && (
              <div className="border border-surface-700 rounded-lg overflow-hidden">
                <div className="flex border-b border-surface-700 bg-surface-900/50">
                  <button type="button"
                    onClick={() => setLineTab("expenses")}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      lineTab === "expenses"
                        ? "border-primary-500 text-primary-400"
                        : "border-transparent text-surface-400 hover:text-white"
                    }`}>
                    <Receipt size={13} /> Expenses
                  </button>
                  <button type="button"
                    onClick={() => setLineTab("items")}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      lineTab === "items"
                        ? "border-primary-500 text-primary-400"
                        : "border-transparent text-surface-400 hover:text-white"
                    }`}>
                    <Package size={13} /> Items
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {/* ── Expenses tab ── */}
                  {lineTab === "expenses" && (
                    <>
                      <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider px-1 mb-1">
                        <span className="col-span-5">Account</span>
                        <span className="col-span-3 text-right">Amount</span>
                        <span className="col-span-3">Memo</span>
                        <span className="col-span-1" />
                      </div>
                      {form.expense_lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <select
                            className={`${inputCls} col-span-5`}
                            value={line.account_id}
                            onChange={(e) => updateExpenseLine(idx, "account_id", e.target.value)}
                          >
                            <option value="">Select expense account…</option>
                            {expenseAccounts.map((a) => (
                              <option key={a.id} value={a.id}
                                disabled={usedExpenseAccounts.has(a.id) && a.id !== line.account_id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number" min="0.01" step="0.01"
                            className={`${inputCls} col-span-3`}
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) => updateExpenseLine(idx, "amount", e.target.value)}
                          />
                          <input
                            className={`${inputCls} col-span-3`}
                            placeholder="Memo (optional)"
                            value={line.description}
                            onChange={(e) => updateExpenseLine(idx, "description", e.target.value)}
                          />
                          <button type="button" onClick={() => removeExpenseLine(idx)}
                            disabled={form.expense_lines.length === 1}
                            className="col-span-1 text-surface-500 hover:text-red-400 disabled:opacity-30 transition-colors flex justify-center"
                            title="Remove line">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addExpenseLine}
                        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        <Plus size={13} /> Add Expense Line
                      </button>
                    </>
                  )}

                  {/* ── Items tab ── */}
                  {lineTab === "items" && (
                    <>
                      <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-medium text-surface-500 uppercase tracking-wider px-1 mb-1">
                        <span className="col-span-3">Item</span>
                        <span className="col-span-3">Account</span>
                        <span className="col-span-2 text-right">Qty</span>
                        <span className="col-span-2 text-right">Unit Cost</span>
                        <span className="col-span-1 text-right">Amount</span>
                        <span className="col-span-1" />
                      </div>
                      {form.item_lines.map((line, idx) => {
                        const lineAmt = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_cost) || 0);
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <select
                              className={`${inputCls} col-span-3`}
                              value={line.product_id}
                              onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                            >
                              <option value="">Select item…</option>
                              {products.filter((p) => p.active !== false).map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <select
                              className={`${inputCls} col-span-3`}
                              value={line.account_id}
                              onChange={(e) => updateItemLine(idx, "account_id", e.target.value)}
                            >
                              <option value="">Account…</option>
                              {expenseAccounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                            <input
                              type="number" min="0.01" step="0.01"
                              className={`${inputCls} col-span-2`}
                              placeholder="1"
                              value={line.quantity}
                              onChange={(e) => updateItemLine(idx, "quantity", e.target.value)}
                            />
                            <input
                              type="number" min="0.01" step="0.01"
                              className={`${inputCls} col-span-2`}
                              placeholder="0.00"
                              value={line.unit_cost}
                              onChange={(e) => updateItemLine(idx, "unit_cost", e.target.value)}
                            />
                            <span className="col-span-1 text-right text-xs text-surface-300 tabular-nums">
                              {lineAmt > 0 ? fmt(lineAmt) : "—"}
                            </span>
                            <button type="button" onClick={() => removeItemLine(idx)}
                              disabled={form.item_lines.length === 1}
                              className="col-span-1 text-surface-500 hover:text-red-400 disabled:opacity-30 transition-colors flex justify-center"
                              title="Remove line">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                      <button type="button" onClick={addItemLine}
                        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        <Plus size={13} /> Add Item Line
                      </button>
                    </>
                  )}
                </div>

                {/* Allocation summary */}
                {chequeAmount > 0 && (
                  <div className={`px-3 py-2 border-t border-surface-700 flex items-center justify-between text-xs ${
                    combinedRemaining < 0 ? "bg-red-500/5" : "bg-surface-900/30"
                  }`}>
                    <span className="text-surface-400">Total allocated: {fmt(combinedTotal)}</span>
                    <span className={combinedRemaining < 0 ? "text-red-400" : combinedRemaining === 0 ? "text-emerald-400" : "text-surface-400"}>
                      {combinedRemaining < 0
                        ? `Over by ${fmt(Math.abs(combinedRemaining))}`
                        : combinedRemaining === 0
                          ? "Fully allocated"
                          : `${fmt(combinedRemaining)} remaining`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Journal preview */}
            {isSupplier && chequeAmount > 0 && form.debit_account_id && (
              <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white">Dr {previewDebitAcc?.name || "Trade Payables"}</span>
                    <span className="text-emerald-400">{fmt(chequeAmount)}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-white">Cr {selectedBank?.name || "Bank"}</span>
                    <span className="text-red-400">{fmt(chequeAmount)}</span>
                  </div>
                </div>
              </div>
            )}
            {isExpense && chequeAmount > 0 && expensesValid && (
              <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                <div className="space-y-1">
                  {form.expense_lines
                    .filter((l) => l.account_id && parseFloat(l.amount) > 0)
                    .map((l, i) => {
                      const acc = accounts.find((a) => a.id === l.account_id);
                      return (
                        <div key={`exp-${i}`} className="flex justify-between">
                          <span className="text-white">Dr {acc?.name || "Expense Account"}</span>
                          <span className="text-emerald-400">{fmt(parseFloat(l.amount))}</span>
                        </div>
                      );
                    })}
                  {form.item_lines
                    .filter((l) => l.account_id && parseFloat(l.quantity) > 0 && parseFloat(l.unit_cost) > 0)
                    .map((l, i) => {
                      const acc = accounts.find((a) => a.id === l.account_id);
                      const amt = parseFloat(l.quantity) * parseFloat(l.unit_cost);
                      return (
                        <div key={`itm-${i}`} className="flex justify-between">
                          <span className="text-white">Dr {acc?.name || "Expense Account"} <span className="text-surface-500">({l.description || "Item"})</span></span>
                          <span className="text-emerald-400">{fmt(amt)}</span>
                        </div>
                      );
                    })}
                  <div className="flex justify-between pl-4 border-t border-surface-700/40 pt-1 mt-1">
                    <span className="text-white">Cr {selectedBank?.name || "Bank"}</span>
                    <span className="text-red-400">{fmt(chequeAmount)}</span>
                  </div>
                </div>
              </div>
            )}
            {isTransfer && parseFloat(transferForm.amount) > 0 && transferForm.to_account_id && (
              <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
                <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white">Dr {previewToAcc?.name || "To Account"}</span>
                    <span className="text-emerald-400">{fmt(parseFloat(transferForm.amount))}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-white">Cr {selectedBank?.name || "From Account"}</span>
                    <span className="text-red-400">{fmt(parseFloat(transferForm.amount))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={clearCurrentForm}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                <X size={14} /> Clear
              </button>
              <button
                onClick={() => isTransfer ? handleTransferSubmit("close") : handleBankSubmit("close")}
                disabled={isTransfer ? transferSubmitDisabled : bankSubmitDisabled}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                Save &amp; Close
              </button>
              <button
                onClick={() => isTransfer ? handleTransferSubmit("new") : handleBankSubmit("new")}
                disabled={isTransfer ? transferSubmitDisabled : bankSubmitDisabled}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
                {isTransfer ? <ArrowLeftRight size={15} /> : <Receipt size={15} />}
                {createMutation.isPending ? "Saving…" : "Save & New"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChequeWritingPage;

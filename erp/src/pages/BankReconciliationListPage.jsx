import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { fetchAccounts } from "@/services/accounts.service";
import {
  useStatements,
  useImportStatement,
} from "@/hooks/useBankReconciliation";
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Landmark,
} from "lucide-react";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import toast from "react-hot-toast";
import { fmt } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";
import { parseBankStatementPdf } from "@/utils/pdfParser";

const today = new Date().toISOString().split("T")[0];

const STATUS_STYLES = {
  draft: { label: "Draft", icon: Clock, cls: "bg-surface-700 text-surface-300" },
  reconciled: { label: "Reconciled", icon: CheckCircle, cls: "bg-emerald-500/15 text-emerald-400" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-red-500/15 text-red-400" },
};

const PAGE_SIZE = 10;

const parseCsvLines = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const descIdx = headers.findIndex((h) => h.includes("description") || h.includes("narrative") || h.includes("details"));
  const refIdx = headers.findIndex((h) => h.includes("reference") || h.includes("ref"));
  const depositIdx = headers.findIndex((h) => h.includes("deposit") || h.includes("credit") || h.includes("money in"));
  const withdrawalIdx = headers.findIndex((h) => h.includes("withdrawal") || h.includes("debit") || h.includes("money out"));

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const rawDate = cols[dateIdx] || "";
    const parsedDate = new Date(rawDate);
    const transaction_date = isNaN(parsedDate.getTime()) ? rawDate : parsedDate.toISOString().split("T")[0];
    const deposit = parseFloat(cols[depositIdx]?.replace(/[^0-9.-]/g, "")) || 0;
    const withdrawal = parseFloat(cols[withdrawalIdx]?.replace(/[^0-9.-]/g, "")) || 0;
    return {
      transaction_date,
      description: cols[descIdx] || "",
      reference: cols[refIdx] || "",
      deposit,
      withdrawal,
    };
  }).filter((l) => l.transaction_date);
};

const BankReconciliationListPage = () => {
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  // Import form state
  const [importAccount, setImportAccount] = useState("");
  const [statementDate, setStatementDate] = useState(today);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [description, setDescription] = useState("");
  const [csvText, setCsvText] = useState("");
  const [parsedLines, setParsedLines] = useState([]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const bankAccounts = useMemo(
    () => accounts.filter((a) => ["bank", "current_asset", "asset"].includes(a.account_class) && a.active),
    [accounts]
  );

  const filters = useMemo(() => {
    const f = {};
    if (filterAccount) f.accountId = filterAccount;
    if (filterStatus) f.status = filterStatus;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    return f;
  }, [filterAccount, filterStatus, filterFrom, filterTo]);

  const { data: statements = [], isLoading } = useStatements(filters);
  const importMutation = useImportStatement();

  const totalPages = Math.max(1, Math.ceil(statements.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = statements.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleParseCsv = (text) => {
    setCsvText(text);
    const lines = parseCsvLines(text);
    setParsedLines(lines);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const result = await parseBankStatementPdf(file);
        setParsedLines(result.lines);
        setOpeningBalance(result.openingBalance.toString());
        setClosingBalance(result.closingBalance.toString());
        if (result.startDate) setStartDate(result.startDate);
        if (result.endDate) setEndDate(result.endDate);
        if (result.lines.length > 0) {
          setStatementDate(result.lines[0].transaction_date);
        }
        toast.success(`Parsed ${result.lines.length} transactions from ${result.bank} statement`);
      } catch (err) {
        toast.error("Failed to parse PDF: " + err.message);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => handleParseCsv(ev.target.result);
      reader.readAsText(file);
    }
  };

  const lineTotal = parsedLines.reduce((sum, l) => sum + l.deposit - l.withdrawal, 0);
  const statementTotal = (parseFloat(closingBalance) || 0) - (parseFloat(openingBalance) || 0);
  const isBalanced = Math.abs(lineTotal - statementTotal) <= 0.01;

  const resetImport = () => {
    setShowImport(false);
    setImportAccount("");
    setStatementDate(today);
    setStartDate("");
    setEndDate("");
    setOpeningBalance("");
    setClosingBalance("");
    setDescription("");
    setCsvText("");
    setParsedLines([]);
  };

  const handleImport = () => {
    if (!importAccount || !statementDate || !startDate || !endDate || !isBalanced || parsedLines.length === 0) return;
    importMutation.mutate(
      {
        bankAccountId: importAccount,
        statementDate,
        startDate,
        endDate,
        openingBalance: parseFloat(openingBalance),
        closingBalance: parseFloat(closingBalance),
        lines: parsedLines,
        description: description || `Statement ${startDate} to ${endDate}`,
      },
      {
        onSuccess: (result) => {
          resetImport();
          if (result?.id) navigate(`/bank-reconciliation/${result.id}`);
        },
      }
    );
  };

  const draftCount = statements.filter((s) => s.status === "draft").length;
  const reconciledCount = statements.filter((s) => s.status === "reconciled").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Total Statements</p>
          <p className="text-xl font-bold text-white">{statements.length}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-xl font-bold text-primary-400">{draftCount}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Reconciled</p>
          <p className="text-xl font-bold text-emerald-400">{reconciledCount}</p>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Upload size={16} className="text-primary-400" />
              Import Bank Statement
            </h2>
            <button onClick={resetImport} className="text-surface-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Bank Account *</label>
              <select className={inputCls} value={importAccount} onChange={(e) => setImportAccount(e.target.value)}>
                <option value="">
                  {bankAccounts.length === 0 
                    ? (accounts.length === 0 ? "Loading accounts…" : "No bank accounts found") 
                    : "Select account…"}
                </option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
              {bankAccounts.length === 0 && accounts.length > 0 && (
                <p className="text-[11px] text-amber-400">
                  No accounts with class "bank" found. Check Chart of Accounts.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Statement Date *</label>
              <input type="date" className={inputCls} value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Description</label>
              <input className={inputCls} placeholder="e.g. March 2026 Statement" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Period Start *</label>
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Period End *</label>
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Opening Balance *</label>
              <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Closing Balance *</label>
              <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
              <label className="text-xs text-surface-400 font-medium">Statement File (CSV or PDF)</label>
              <input type="file" accept=".csv,.txt,.pdf" onChange={handleFileUpload} className="block w-full text-sm text-surface-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700" />
              <p className="text-[11px] text-surface-500">Supports CSV and KCB Bank PDF statements</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Or paste CSV text</label>
            <textarea
              className={`${inputCls} min-h-[120px] font-mono text-xs`}
              placeholder={`Date,Description,Reference,Deposit,Withdrawal\n2026-03-01,Sales Deposit,REF001,50000,0`}
              value={csvText}
              onChange={(e) => handleParseCsv(e.target.value)}
            />
            <p className="text-[11px] text-surface-500">Expected columns: Date, Description, Reference, Deposit, Withdrawal</p>
          </div>

          {parsedLines.length > 0 && (
            <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-surface-400">Parsed lines</span>
                <span className="text-white">{parsedLines.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Line total</span>
                <span className={isBalanced ? "text-emerald-400" : "text-red-400"}>{fmt(lineTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Expected total (closing - opening)</span>
                <span className="text-white">{fmt(statementTotal)}</span>
              </div>
              {!isBalanced && (
                <p className="text-xs text-red-400">Difference: {fmt(statementTotal - lineTotal)} — lines must balance before import.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={resetImport} className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={
                !importAccount || !statementDate || !startDate || !endDate ||
                parsedLines.length === 0 || !isBalanced || importMutation.isPending
              }
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              {importMutation.isPending ? "Importing…" : <><Upload size={15} /> Import Statement</>}
            </button>
          </div>
        </div>
      )}

      {/* Statements table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-white mr-auto flex items-center gap-2">
            <Landmark size={18} className="text-primary-400" />
            Bank Statements
          </h2>
          <select className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}>
            <option value="">All Accounts</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="reconciled">Reconciled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
          {!showImport && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={15} /> Import
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : statements.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <FileText size={36} className="mx-auto mb-3 text-surface-700" />
            <p>No statements found</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Bank Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Opening</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Closing</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {pageItems.map((s) => {
                    const st = STATUS_STYLES[s.status] || STATUS_STYLES.draft;
                    const Icon = st.icon;
                    return (
                      <tr key={s.id} className="hover:bg-surface-700/30 transition-colors cursor-pointer" onClick={() => navigate(`/bank-reconciliation/${s.id}`)}>
                        <td className="px-4 py-3 text-white">{new Date(s.statement_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3 text-surface-300">{s.bank_account?.name || "—"}</td>
                        <td className="px-4 py-3 text-surface-300">{s.description || "—"}</td>
                        <td className="px-4 py-3 text-right text-surface-300">{fmt(s.opening_balance)}</td>
                        <td className="px-4 py-3 text-right text-surface-300">{fmt(s.closing_balance)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                            <Icon size={11} /> {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-primary-400 hover:text-primary-300 text-xs font-medium">View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <MobileCardList>
              {pageItems.map((s) => {
                const st = STATUS_STYLES[s.status] || STATUS_STYLES.draft;
                const Icon = st.icon;
                return (
                  <MobileCard key={s.id} onClick={() => navigate(`/bank-reconciliation/${s.id}`)}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{new Date(s.statement_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                        <Icon size={11} /> {st.label}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm">{s.bank_account?.name || "—"}</p>
                    <p className="text-xs text-surface-500">{s.description || "—"}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-400">Open: <span className="text-white">{fmt(s.opening_balance)}</span></span>
                      <span className="text-surface-400">Close: <span className="text-white">{fmt(s.closing_balance)}</span></span>
                    </div>
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, statements.length)} of {statements.length}
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

export default BankReconciliationListPage;

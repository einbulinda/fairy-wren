import { useState, useMemo, useCallback } from "react";
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { useSettings } from "@/hooks/useSettings";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MobileCard, MobileField } from "@/components/shared/MobileCard";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

const today = new Date();
const defaultEndDate = today.toISOString().split("T")[0];
const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .split("T")[0];

const CLASS_LABELS = {
  asset: "Asset",
  current_asset: "Current Asset",
  non_current_asset: "Non-Current Asset",
  liability: "Liability",
  current_liability: "Current Liability",
  non_current_liability: "Non-Current Liability",
  equity: "Equity",
  income: "Income",
  cost_of_sales: "Cost of Sales",
  expense: "Expense",
  operating_cost: "Operating Cost",
  admin_cost: "Admin Cost",
  finance_cost: "Finance Cost",
};

const CLASS_ORDER = [
  "asset",
  "current_asset",
  "non_current_asset",
  "liability",
  "current_liability",
  "non_current_liability",
  "equity",
  "income",
  "cost_of_sales",
  "expense",
  "operating_cost",
  "admin_cost",
  "finance_cost",
];

// --- PDF Generation ---

const generatePDF = (accounts, totals, startDate, endDate, orgName) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const accentColor = [194, 120, 3];
  const darkText = [33, 33, 33];
  const mediumText = [100, 100, 100];

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(orgName || "Fairy Wren Limited", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(14);
  doc.text("TRIAL BALANCE", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mediumText);
  doc.text(
    `For the period ${fmtDate(startDate)} to ${fmtDate(endDate)}`,
    pageWidth / 2,
    29,
    { align: "center" }
  );
  doc.text("(Amounts in KES)", pageWidth / 2, 34, { align: "center" });

  const tableBody = accounts.map((a) => [
    a.account_code,
    a.account_name,
    fmt(a.total_debit),
    fmt(a.total_credit),
  ]);

  // Totals row
  tableBody.push([
    { content: "", styles: { lineWidth: { top: 0.5 }, lineColor: accentColor } },
    {
      content: "TOTALS",
      styles: {
        fontStyle: "bold",
        lineWidth: { top: 0.5 },
        lineColor: accentColor,
      },
    },
    {
      content: fmt(totals.totalDebit),
      styles: {
        fontStyle: "bold",
        halign: "right",
        lineWidth: { top: 0.5 },
        lineColor: accentColor,
      },
    },
    {
      content: fmt(totals.totalCredit),
      styles: {
        fontStyle: "bold",
        halign: "right",
        lineWidth: { top: 0.5 },
        lineColor: accentColor,
      },
    },
  ]);

  autoTable(doc, {
    startY: 40,
    head: [["Code", "Account", "Debit (KES)", "Credit (KES)"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: mediumText,
      cellPadding: { top: 1, bottom: 1, left: 4, right: 4 },
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - 15,
        pageHeight - 10,
        { align: "right" }
      );
    },
  });

  doc.save(`trial-balance-${startDate}-to-${endDate}.pdf`);
};

// --- Main Component ---

const TrialBalancePage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const { data, isLoading, isFetching } = useTrialBalance(startDate, endDate);
  const { data: settings } = useSettings();
  const orgName = settings?.organisation_name || "Fairy Wren Limited";

  const { accounts, totals, grouped } = useMemo(() => {
    if (!data?.accounts)
      return { accounts: [], totals: null, grouped: [] };

    const accts = data.accounts;

    const totalDebit = accts.reduce((s, a) => s + Number(a.total_debit), 0);
    const totalCredit = accts.reduce((s, a) => s + Number(a.total_credit), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    // Group by account_class for sectioned display
    const classMap = {};
    accts.forEach((a) => {
      const cls = a.account_class;
      if (!classMap[cls]) classMap[cls] = [];
      classMap[cls].push(a);
    });

    const grp = CLASS_ORDER.filter((cls) => classMap[cls]).map((cls) => ({
      cls,
      label: CLASS_LABELS[cls] || cls,
      accounts: classMap[cls],
      debit: classMap[cls].reduce((s, a) => s + Number(a.total_debit), 0),
      credit: classMap[cls].reduce((s, a) => s + Number(a.total_credit), 0),
    }));

    return {
      accounts: accts,
      totals: { totalDebit, totalCredit, difference, isBalanced },
      grouped: grp,
    };
  }, [data]);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handleDownloadPdf = useCallback(() => {
    if (accounts.length > 0 && totals) {
      generatePDF(accounts, totals, startDate, endDate, orgName);
    }
  }, [accounts, totals, startDate, endDate, orgName]);

  const inputCls =
    "px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Trial Balance</h1>
              <p className="text-sm text-surface-400">
                For the period {fmtDate(startDate)} to {fmtDate(endDate)}
              </p>
              <p className="text-xs text-surface-500">(Amounts in KES)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                From
              </label>
              <input
                type="date"
                className={inputCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                To
              </label>
              <input
                type="date"
                className={inputCls}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {accounts.length > 0 && (
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors self-end"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            )}
            {isFetching && (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin self-end mb-2" />
            )}
          </div>
        </div>
      </div>

      {/* Loading / Empty */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center text-surface-500">
          <BarChart3 size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date range to generate the trial balance</p>
        </div>
      ) : (
        <>
          {/* Trial Balance Table */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider w-24">Code</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-40">Debit (KES)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-40">Credit (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {grouped.map((group) => (
                    <ClassSection key={group.cls} group={group} />
                  ))}
                  <tr className="border-t-2 border-surface-500 bg-surface-900/50">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-bold text-white text-base">Totals</td>
                    <td className="px-4 py-3 text-right font-bold text-white text-base tabular-nums border-b-2 border-surface-500">{fmt(totals.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-white text-base tabular-nums border-b-2 border-surface-500">{fmt(totals.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-3">
              {grouped.map((group) => (
                <MobileClassSection key={group.cls} group={group} />
              ))}
              <MobileCard className="bg-surface-900/50! border-surface-500">
                <div className="font-bold text-white text-base">Totals</div>
                <MobileField label="Debit"><span className="font-bold tabular-nums">{fmt(totals.totalDebit)}</span></MobileField>
                <MobileField label="Credit"><span className="font-bold tabular-nums">{fmt(totals.totalCredit)}</span></MobileField>
              </MobileCard>
            </div>
          </div>

          {/* Balance Verification */}
          <div
            className={`border rounded-xl p-4 flex items-center justify-between ${
              totals.isBalanced
                ? "bg-emerald-900/20 border-emerald-700/50"
                : "bg-amber-900/20 border-amber-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {totals.isBalanced ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    totals.isBalanced ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totals.isBalanced
                    ? "Trial Balance is balanced"
                    : "Trial Balance is out of balance"}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Total Debits ({fmt(totals.totalDebit)}) = Total Credits (
                  {fmt(totals.totalCredit)})
                </p>
              </div>
            </div>
            {!totals.isBalanced && (
              <div className="text-right">
                <p className="text-xs text-surface-400">Difference</p>
                <p className="font-bold text-amber-400">
                  {fmt(totals.difference)}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// --- Class Section (collapsible group) ---

const ClassSection = ({ group }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <td colSpan={4} className="px-0 py-0">
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary-900/30 border-y border-primary-700/30 hover:bg-primary-900/50 transition-colors">
            <div className="flex items-center gap-2">
              {collapsed ? (
                <ChevronRight size={16} className="text-primary-400" />
              ) : (
                <ChevronDown size={16} className="text-primary-400" />
              )}
              <span className="font-bold text-white tracking-wide text-sm">
                {group.label}
              </span>
              <span className="text-xs text-surface-400 ml-2">
                ({group.accounts.length} account{group.accounts.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="flex gap-8 text-sm font-semibold text-white tabular-nums">
              <span className="w-32 text-right">{fmt(group.debit)}</span>
              <span className="w-32 text-right">{fmt(group.credit)}</span>
            </div>
          </div>
        </td>
      </tr>

      {!collapsed &&
        group.accounts.map((account) => (
          <tr
            key={account.account_id}
            className="hover:bg-surface-700/20 transition-colors"
          >
            <td className="px-4 py-2 text-surface-500 text-xs font-mono pl-8">
              {account.account_code}
            </td>
            <td className="px-4 py-2 text-surface-300">
              {account.account_name}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-surface-300">
              {fmt(account.total_debit)}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-surface-300">
              {fmt(account.total_credit)}
            </td>
          </tr>
        ))}
    </>
  );
};

// --- Mobile Class Section ---

const MobileClassSection = ({ group }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <MobileCard onClick={() => setCollapsed((p) => !p)} className="bg-primary-900/30! border-primary-700/30">
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={16} className="text-primary-400" /> : <ChevronDown size={16} className="text-primary-400" />}
          <span className="font-bold text-white tracking-wide text-sm">{group.label}</span>
          <span className="text-xs text-surface-400">({group.accounts.length})</span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-white tabular-nums">
          <span>Dr {fmt(group.debit)}</span>
          <span>Cr {fmt(group.credit)}</span>
        </div>
      </MobileCard>
      {!collapsed && (
        <div className="space-y-1.5 mt-1.5 ml-3">
          {group.accounts.map((account) => (
            <MobileCard key={account.account_id} className="py-3!">
              <div className="flex items-center gap-2">
                <span className="text-surface-500 text-xs font-mono">{account.account_code}</span>
                <span className="text-surface-300 text-sm">{account.account_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs tabular-nums text-surface-300">
                {Number(account.total_debit) > 0 && <span className="text-emerald-400">Dr {fmt(account.total_debit)}</span>}
                {Number(account.total_credit) > 0 && <span className="text-red-400 ml-auto">Cr {fmt(account.total_credit)}</span>}
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrialBalancePage;

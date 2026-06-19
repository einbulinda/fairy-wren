import { useState, useMemo, useCallback } from "react";
import { useCashFlowStatement } from "@/hooks/useCashFlowStatement";
import { dateInputCls } from "@/utils/constants";
import { useSettings } from "@/hooks/useSettings";
import {
  DollarSign,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNumber as fmt, localDateStr } from "@/utils/formatters";

const defaultEndDate = localDateStr();
const defaultStartDate = localDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

const CASH_CODE_PREFIX = "10"; // 1010 Cash, 1020 Bank, etc.
const ASSET_CLASSES = ["asset", "current_asset"];
const CURRENT_ASSET_CLASSES = ["asset", "current_asset"];
const CURRENT_LIABILITY_CLASSES = ["liability", "current_liability"];
const NON_CURRENT_ASSET_CLASSES = ["non_current_asset"];
const NON_CURRENT_LIABILITY_CLASSES = ["non_current_liability"];

const isCashAccount = (a) =>
  ASSET_CLASSES.includes(a.account_class) &&
  a.account_code.startsWith(CASH_CODE_PREFIX);

// --- Sub-components ---

const SectionHeader = ({ title, collapsed, onToggle }) => (
  <tr className="cursor-pointer select-none" onClick={onToggle}>
    <td colSpan={2} className="px-0 py-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-900/30 border-y border-primary-700/30 hover:bg-primary-900/50 transition-colors">
        {collapsed ? (
          <ChevronRight size={16} className="text-primary-400" />
        ) : (
          <ChevronDown size={16} className="text-primary-400" />
        )}
        <span className="font-bold text-white tracking-wide text-sm">
          {title}
        </span>
      </div>
    </td>
  </tr>
);

const LineItemRow = ({ label, amount, indent = 0, bold = false }) => (
  <tr className="hover:bg-surface-700/20 transition-colors">
    <td
      className={`px-4 py-2 ${bold ? "text-white font-medium" : "text-surface-300"}`}
      style={{ paddingLeft: `${20 + indent * 16}px` }}
    >
      {label}
    </td>
    <td
      className={`px-4 py-2 text-right tabular-nums ${
        bold ? "text-white font-medium" : "text-surface-300"
      } ${Number(amount) < 0 ? "text-red-400" : ""}`}
    >
      {Number(amount) < 0 ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
    </td>
  </tr>
);

const SubtotalRow = ({ label, amount }) => (
  <tr className="border-t border-surface-700/50">
    <td className="px-4 py-2.5 font-semibold text-white text-sm pl-5">
      {label}
    </td>
    <td
      className={`px-4 py-2.5 text-right tabular-nums font-semibold text-sm ${
        Number(amount) < 0 ? "text-red-400" : "text-white"
      }`}
    >
      {Number(amount) < 0 ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
    </td>
  </tr>
);

const GrandTotalRow = ({ label, amount }) => (
  <tr className="border-t-2 border-b-2 border-primary-600/50 bg-primary-900/20">
    <td className="px-4 py-3 font-bold text-white text-base pl-5">{label}</td>
    <td
      className={`px-4 py-3 text-right tabular-nums font-bold text-base ${
        Number(amount) < 0 ? "text-red-400" : "text-white"
      }`}
    >
      {Number(amount) < 0 ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
    </td>
  </tr>
);

const SpacerRow = () => (
  <tr>
    <td colSpan={2} className="py-2" />
  </tr>
);

const CollapsibleSection = ({ title, items, subtotalLabel, subtotalAmount }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <SectionHeader
        title={title}
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
      />
      {!collapsed && (
        <>
          {items.map((item) => (
            <LineItemRow
              key={item.account_id}
              label={item.label}
              amount={item.effect}
              indent={1}
            />
          ))}
          <SubtotalRow label={subtotalLabel} amount={subtotalAmount} />
        </>
      )}
      {collapsed && (
        <SubtotalRow label={subtotalLabel} amount={subtotalAmount} />
      )}
    </>
  );
};

// --- PDF Generation ---

const buildPdfRows = (sections) => {
  const rows = [];

  // Operating Activities
  rows.push({ type: "section", label: "Cash Flows from Operating Activities" });
  rows.push({ type: "item", label: "Net Income", amount: sections.netIncome });

  if (sections.workingCapitalItems.length > 0) {
    rows.push({ type: "divider", label: "Changes in Working Capital:" });
    sections.workingCapitalItems.forEach((item) => {
      rows.push({ type: "item", label: item.label, amount: item.effect, indent: 1 });
    });
  }

  rows.push({
    type: "subtotal",
    label: "Net Cash from Operating Activities",
    amount: sections.operatingCash,
  });

  rows.push({ type: "spacer" });

  // Investing Activities
  if (sections.investingItems.length > 0) {
    rows.push({ type: "section", label: "Cash Flows from Investing Activities" });
    sections.investingItems.forEach((item) => {
      rows.push({ type: "item", label: item.label, amount: item.effect, indent: 1 });
    });
    rows.push({
      type: "subtotal",
      label: "Net Cash from Investing Activities",
      amount: sections.investingCash,
    });
    rows.push({ type: "spacer" });
  }

  // Financing Activities
  if (sections.financingItems.length > 0) {
    rows.push({ type: "section", label: "Cash Flows from Financing Activities" });
    sections.financingItems.forEach((item) => {
      rows.push({ type: "item", label: item.label, amount: item.effect, indent: 1 });
    });
    rows.push({
      type: "subtotal",
      label: "Net Cash from Financing Activities",
      amount: sections.financingCash,
    });
    rows.push({ type: "spacer" });
  }

  // Net change
  rows.push({
    type: "grandtotal",
    label: "Net Increase/(Decrease) in Cash",
    amount: sections.netCashChange,
  });

  rows.push({ type: "spacer" });
  rows.push({ type: "item", label: "Opening Cash Balance", amount: sections.openingCash });
  rows.push({
    type: "grandtotal",
    label: "Closing Cash Balance",
    amount: sections.closingCash,
  });

  return rows;
};

const generatePDF = (sections, startDate, endDate, orgName) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const accentColor = [194, 120, 3];
  const headerBg = [245, 237, 220];
  const darkText = [33, 33, 33];
  const mediumText = [100, 100, 100];

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Nairobi",
    });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(orgName || "Fairy Wren Limited", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(14);
  doc.text("CASH FLOW STATEMENT", pageWidth / 2, 22, { align: "center" });

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

  const pdfRows = buildPdfRows(sections);
  const tableBody = [];

  const fmtPdf = (n) =>
    Number(n) < 0 ? `(${fmt(Math.abs(n))})` : fmt(n);

  pdfRows.forEach((row) => {
    if (row.type === "spacer") {
      tableBody.push([
        { content: "", colSpan: 2, styles: { cellPadding: { top: 1.5, bottom: 1.5 } } },
      ]);
      return;
    }
    if (row.type === "divider") {
      tableBody.push([
        {
          content: row.label,
          colSpan: 2,
          styles: {
            fontStyle: "italic",
            fontSize: 8,
            textColor: mediumText,
            cellPadding: { top: 2, bottom: 2, left: 5 },
          },
        },
      ]);
      return;
    }
    if (row.type === "section") {
      tableBody.push([
        {
          content: row.label,
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fontSize: 9.5,
            fillColor: headerBg,
            textColor: darkText,
            cellPadding: { top: 1.5, bottom: 1.5, left: 5 },
          },
        },
      ]);
      return;
    }

    const indent = row.indent ? row.indent * 6 : 0;
    const amount = fmtPdf(row.amount);

    if (row.type === "grandtotal") {
      tableBody.push([
        {
          content: row.label,
          styles: {
            fontStyle: "bold",
            fontSize: 10,
            textColor: darkText,
            cellPadding: { top: 2, bottom: 2, left: 5 },
            lineWidth: { top: 0.5, bottom: 0.5 },
            lineColor: accentColor,
          },
        },
        {
          content: amount,
          styles: {
            fontStyle: "bold",
            fontSize: 10,
            halign: "right",
            textColor: darkText,
            cellPadding: { top: 2, bottom: 2, right: 5 },
            lineWidth: { top: 0.5, bottom: 0.5 },
            lineColor: accentColor,
          },
        },
      ]);
      return;
    }

    if (row.type === "subtotal") {
      tableBody.push([
        {
          content: row.label,
          styles: {
            fontStyle: "bold",
            fontSize: 9,
            textColor: darkText,
            cellPadding: { top: 1.5, bottom: 1.5, left: 10 },
            lineWidth: { top: 0.3 },
            lineColor: [180, 180, 180],
          },
        },
        {
          content: amount,
          styles: {
            fontStyle: "bold",
            fontSize: 9,
            halign: "right",
            textColor: darkText,
            cellPadding: { top: 1.5, bottom: 1.5, right: 5 },
            lineWidth: { top: 0.3 },
            lineColor: [180, 180, 180],
          },
        },
      ]);
      return;
    }

    // Regular item
    tableBody.push([
      {
        content: row.label,
        styles: {
          fontSize: 9,
          textColor: mediumText,
          cellPadding: { top: 1, bottom: 1, left: 10 + indent },
        },
      },
      {
        content: amount,
        styles: {
          fontSize: 9,
          halign: "right",
          textColor: mediumText,
          cellPadding: { top: 1, bottom: 1, right: 5 },
        },
      },
    ]);
  });

  autoTable(doc, {
    startY: 40,
    head: [["Description", "Amount (KES)"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 2, bottom: 2, left: 5, right: 5 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 45, halign: "right" },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" })}`,
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

  doc.save(`cash-flow-statement-${startDate}-to-${endDate}.pdf`);
};

// --- Main Component ---

const CashFlowStatementPage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const { data, isLoading, isFetching } = useCashFlowStatement(startDate, endDate);
  const { data: settings } = useSettings();
  const orgName = settings?.organisation_name || "Fairy Wren Limited";

  const sections = useMemo(() => {
    if (!data?.accounts) return null;

    const accounts = data.accounts;
    const netIncome = Number(data.netIncome ?? 0);

    // Separate cash accounts from the rest
    const cashAccounts = accounts.filter(isCashAccount);
    const nonCashAccounts = accounts.filter((a) => !isCashAccount(a));

    // Working capital: non-cash current assets + current liabilities
    const workingCapitalItems = [];

    // Non-cash current assets: increase = outflow, decrease = inflow
    nonCashAccounts
      .filter((a) => CURRENT_ASSET_CLASSES.includes(a.account_class))
      .filter((a) => Math.abs(Number(a.net_change)) >= 0.01)
      .forEach((a) => {
        const change = Number(a.net_change);
        workingCapitalItems.push({
          account_id: a.account_id,
          label:
            change > 0
              ? `Increase in ${a.account_name}`
              : `Decrease in ${a.account_name}`,
          effect: -change, // increase in asset = cash outflow
        });
      });

    // Current liabilities: increase = inflow, decrease = outflow
    nonCashAccounts
      .filter((a) => CURRENT_LIABILITY_CLASSES.includes(a.account_class))
      .filter((a) => Math.abs(Number(a.net_change)) >= 0.01)
      .forEach((a) => {
        const change = Number(a.net_change);
        workingCapitalItems.push({
          account_id: a.account_id,
          label:
            change > 0
              ? `Increase in ${a.account_name}`
              : `Decrease in ${a.account_name}`,
          effect: change, // increase in liability = cash inflow
        });
      });

    const totalWorkingCapital = workingCapitalItems.reduce(
      (s, i) => s + i.effect,
      0
    );
    const operatingCash = netIncome + totalWorkingCapital;

    // Investing: non-current assets
    const investingItems = [];
    nonCashAccounts
      .filter((a) => NON_CURRENT_ASSET_CLASSES.includes(a.account_class))
      .filter((a) => Math.abs(Number(a.net_change)) >= 0.01)
      .forEach((a) => {
        const change = Number(a.net_change);
        investingItems.push({
          account_id: a.account_id,
          label:
            change > 0
              ? `Purchase of ${a.account_name}`
              : `Disposal of ${a.account_name}`,
          effect: -change, // increase in NCA = cash outflow
        });
      });
    const investingCash = investingItems.reduce((s, i) => s + i.effect, 0);

    // Financing: non-current liabilities + equity
    const financingItems = [];
    nonCashAccounts
      .filter(
        (a) =>
          NON_CURRENT_LIABILITY_CLASSES.includes(a.account_class) ||
          a.account_class === "equity"
      )
      .filter((a) => Math.abs(Number(a.net_change)) >= 0.01)
      .forEach((a) => {
        const change = Number(a.net_change);
        const isEquity = a.account_class === "equity";
        financingItems.push({
          account_id: a.account_id,
          label:
            change > 0
              ? isEquity
                ? `Capital contribution — ${a.account_name}`
                : `Proceeds from ${a.account_name}`
              : isEquity
                ? `Distribution — ${a.account_name}`
                : `Repayment of ${a.account_name}`,
          effect: change, // increase in liability/equity = cash inflow
        });
      });
    const financingCash = financingItems.reduce((s, i) => s + i.effect, 0);

    // Cash reconciliation
    const netCashChange = operatingCash + investingCash + financingCash;
    const openingCash = cashAccounts.reduce(
      (s, a) => s + Number(a.opening_balance),
      0
    );
    const closingCash = cashAccounts.reduce(
      (s, a) => s + Number(a.closing_balance),
      0
    );

    return {
      netIncome,
      workingCapitalItems,
      totalWorkingCapital,
      operatingCash,
      investingItems,
      investingCash,
      financingItems,
      financingCash,
      netCashChange,
      openingCash,
      closingCash,
    };
  }, [data]);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Nairobi",
    });

  const handleDownloadPdf = useCallback(() => {
    if (sections) {
      generatePDF(sections, startDate, endDate, orgName);
    }
  }, [sections, startDate, endDate, orgName]);

  const inputCls = dateInputCls;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <DollarSign size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                Cash Flow Statement
              </h1>
              <p className="text-sm text-surface-400">
                For the period {fmtDate(startDate)} to {fmtDate(endDate)}
              </p>
              <p className="text-xs text-surface-500">(Amounts in KES)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3 sm:ml-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">From</label>
              <input type="date" className={inputCls + " w-full"} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">To</label>
              <input type="date" className={inputCls + " w-full"} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {sections && (
              <button
                onClick={handleDownloadPdf}
                className="col-span-2 sm:col-auto flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors sm:self-end"
              >
                <Download size={16} />
                <span>Download PDF</span>
              </button>
            )}
            {isFetching && (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin col-span-2 sm:col-auto sm:self-end sm:mb-2 mx-auto sm:mx-0" />
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {sections && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Operating Activities
            </p>
            <p
              className={`text-xl font-bold ${
                sections.operatingCash >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {sections.operatingCash < 0
                ? `(${fmt(Math.abs(sections.operatingCash))})`
                : fmt(sections.operatingCash)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Investing Activities
            </p>
            <p
              className={`text-xl font-bold ${
                sections.investingCash >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {sections.investingCash < 0
                ? `(${fmt(Math.abs(sections.investingCash))})`
                : fmt(sections.investingCash)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Net Cash Change
            </p>
            <p
              className={`text-xl font-bold ${
                sections.netCashChange >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {sections.netCashChange < 0
                ? `(${fmt(Math.abs(sections.netCashChange))})`
                : fmt(sections.netCashChange)}
            </p>
          </div>
        </div>
      )}

      {/* Loading / Empty */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !sections ? (
        <div className="py-16 text-center text-surface-500">
          <DollarSign size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date range to generate the cash flow statement</p>
        </div>
      ) : (
        <>
          {/* Cash Flow Table */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-28 sm:w-48">
                      Amount (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {/* === OPERATING ACTIVITIES === */}
                  <CollapsibleSection
                    title="Cash Flows from Operating Activities"
                    items={[
                      {
                        account_id: "__net_income",
                        label: "Net Income",
                        effect: sections.netIncome,
                      },
                      ...sections.workingCapitalItems,
                    ]}
                    subtotalLabel="Net Cash from Operating Activities"
                    subtotalAmount={sections.operatingCash}
                  />

                  <SpacerRow />

                  {/* === INVESTING ACTIVITIES === */}
                  {sections.investingItems.length > 0 && (
                    <>
                      <CollapsibleSection
                        title="Cash Flows from Investing Activities"
                        items={sections.investingItems}
                        subtotalLabel="Net Cash from Investing Activities"
                        subtotalAmount={sections.investingCash}
                      />
                      <SpacerRow />
                    </>
                  )}

                  {/* === FINANCING ACTIVITIES === */}
                  {sections.financingItems.length > 0 && (
                    <>
                      <CollapsibleSection
                        title="Cash Flows from Financing Activities"
                        items={sections.financingItems}
                        subtotalLabel="Net Cash from Financing Activities"
                        subtotalAmount={sections.financingCash}
                      />
                      <SpacerRow />
                    </>
                  )}

                  {/* === NET CHANGE === */}
                  <GrandTotalRow
                    label="Net Increase/(Decrease) in Cash"
                    amount={sections.netCashChange}
                  />

                  <SpacerRow />

                  <LineItemRow
                    label="Opening Cash Balance"
                    amount={sections.openingCash}
                    bold
                  />

                  <GrandTotalRow
                    label="Closing Cash Balance"
                    amount={sections.closingCash}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div
            className={`border rounded-xl p-4 flex items-center justify-between ${
              Math.abs(sections.closingCash - (sections.openingCash + sections.netCashChange)) < 0.01
                ? "bg-emerald-900/20 border-emerald-700/50"
                : "bg-amber-900/20 border-amber-700/50"
            }`}
          >
            <div>
              <p className="font-semibold text-emerald-400 text-sm">
                Cash Reconciliation
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                Opening ({fmt(sections.openingCash)}) + Net Change (
                {sections.netCashChange < 0
                  ? `(${fmt(Math.abs(sections.netCashChange))})`
                  : fmt(sections.netCashChange)}
                ) = Closing ({fmt(sections.closingCash)})
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CashFlowStatementPage;

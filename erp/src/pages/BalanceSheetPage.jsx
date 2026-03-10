import { useState, useMemo, useCallback } from "react";
import { useBalanceSheet } from "@/hooks/useBalanceSheet";
import { dateInputCls } from "@/utils/constants";
import { useSettings } from "@/hooks/useSettings";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNumber as fmt } from "@/utils/formatters";
import AccountLedgerModal from "@/components/shared/AccountLedgerModal";

const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const defaultStartDate = new Date(today.getFullYear(), 0, 1)
  .toISOString()
  .split("T")[0];

// Build a tree from flat accounts list
const buildTree = (accounts) => {
  const map = {};
  const roots = [];

  accounts.forEach((a) => {
    map[a.account_id] = { ...a, children: [] };
  });

  accounts.forEach((a) => {
    if (a.parent_id && map[a.parent_id]) {
      map[a.parent_id].children.push(map[a.account_id]);
    } else {
      roots.push(map[a.account_id]);
    }
  });

  const rollUp = (node) => {
    if (node.children.length > 0) {
      node.children.forEach(rollUp);
      const childSum = node.children.reduce((s, c) => s + Number(c.balance), 0);
      if (Number(node.balance) === 0) {
        node.balance = childSum;
      }
    }
  };
  roots.forEach(rollUp);

  return roots;
};

const ASSET_CLASSES = ["asset", "current_asset", "non_current_asset"];
const LIABILITY_CLASSES = ["liability", "current_liability", "non_current_liability"];

const getRenderNodes = (roots) => {
  if (roots.length === 1 && roots[0].children.length > 0) {
    return roots[0].children;
  }
  return roots;
};

const sumRoots = (roots) => roots.reduce((s, n) => s + Number(n.balance), 0);

// --- Sub-components ---

const LineItem = ({ node, depth = 0, onDrillDown }) => {
  const [expanded, setExpanded] = useState(!node.is_control_account);
  const hasChildren = node.children.length > 0;
  const balance = Number(node.balance);
  const canDrill = !hasChildren && balance !== 0 && onDrillDown;

  return (
    <>
      <tr className="hover:bg-surface-700/20 transition-colors">
        <td className="px-4 py-2 text-surface-300">
          <div
            className="flex items-center gap-1.5"
            style={{ paddingLeft: `${(depth + 1) * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="p-0.5 rounded hover:bg-surface-600 text-surface-400"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className={hasChildren ? "text-white font-medium" : ""}>
              {node.account_name}
            </span>
          </div>
        </td>
        <td
          className={`px-4 py-2 text-right tabular-nums ${
            hasChildren ? "text-white font-medium" : "text-surface-300"
          }`}
        >
          {!expanded || !hasChildren ? (
            canDrill ? (
              <button
                onClick={() => onDrillDown(node.account_id, node.account_name)}
                className="text-primary-400 hover:text-primary-300 underline decoration-dotted underline-offset-2 transition-colors"
              >
                {fmt(balance)}
              </button>
            ) : (
              fmt(balance)
            )
          ) : ""}
        </td>
      </tr>
      {expanded &&
        hasChildren && (
          <>
            {node.children.map((child) => (
              <LineItem key={child.account_id} node={child} depth={depth + 1} onDrillDown={onDrillDown} />
            ))}
            <tr className="border-t border-surface-700/50">
              <td
                className="px-4 py-1.5 text-surface-400 text-xs font-semibold"
                style={{ paddingLeft: `${(depth + 2) * 20}px` }}
              >
                Total {node.account_name}
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums text-white font-semibold text-xs">
                {fmt(balance)}
              </td>
            </tr>
          </>
        )}
    </>
  );
};

const CollapsibleSection = ({ title, nodes, subtotalLabel, subtotalAmount, children, onDrillDown }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Section header row */}
      <tr
        className="cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <td
          colSpan={2}
          className="px-0 py-0"
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary-900/30 border-y border-primary-700/30 hover:bg-primary-900/50 transition-colors">
            <div className="flex items-center gap-2">
              {collapsed ? (
                <ChevronRight size={16} className="text-primary-400" />
              ) : (
                <ChevronDown size={16} className="text-primary-400" />
              )}
              <span className="font-bold text-white tracking-wide text-sm">
                {title}
              </span>
            </div>
            <span className="text-sm font-semibold text-white tabular-nums">
              {fmt(subtotalAmount)}
            </span>
          </div>
        </td>
      </tr>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {nodes.map((node) => (
            <LineItem key={node.account_id} node={node} onDrillDown={onDrillDown} />
          ))}
          {children}
          <tr className="border-t border-surface-600">
            <td className="px-4 py-2 font-semibold text-white" style={{ paddingLeft: "28px" }}>
              {subtotalLabel}
            </td>
            <td className="px-4 py-2 text-right font-semibold text-white tabular-nums">
              {fmt(subtotalAmount)}
            </td>
          </tr>
        </>
      )}
    </>
  );
};

const GrandTotalRow = ({ label, amount }) => (
  <tr className="border-t-2 border-surface-500 bg-surface-900/50">
    <td className="px-4 py-3 font-bold text-white text-base">{label}</td>
    <td className="px-4 py-3 text-right font-bold text-white text-base tabular-nums border-b-2 border-surface-500">
      {fmt(amount)}
    </td>
  </tr>
);

const SpacerRow = () => (
  <tr>
    <td colSpan={2} className="py-3" />
  </tr>
);

// --- PDF Generation ---

const flattenNodes = (nodes, depth = 0) => {
  const rows = [];
  nodes.forEach((node) => {
    rows.push({
      type: "line",
      label: node.account_name,
      amount: Number(node.balance),
      depth,
    });
    if (node.children.length > 0) {
      rows.push(...flattenNodes(node.children, depth + 1));
    }
  });
  return rows;
};

const buildPdfRows = (sections) => {
  const rows = [];

  // Equity
  rows.push({ type: "section", label: "Equity" });
  rows.push(...flattenNodes(getRenderNodes(sections.equityTree)));
  rows.push({ type: "line", label: "Retained Earnings (Net Income)", amount: sections.netIncome, depth: 0, italic: true });
  rows.push({ type: "subtotal", label: "Total Equity", amount: sections.totalEquity });

  rows.push({ type: "spacer" });

  // Non-current Liabilities
  rows.push({ type: "section", label: "Non-current Liabilities" });
  rows.push(...flattenNodes(getRenderNodes(sections.nonCurrentLiabilities)));
  rows.push({ type: "subtotal", label: "Total Non-current Liabilities", amount: sections.totalNonCurrentLiabilities });

  rows.push({ type: "spacer" });

  // Total Equity & Non-current Liabilities
  rows.push({ type: "grandtotal", label: "Total Equity and Non-current Liabilities", amount: sections.totalEquityAndNonCurrentLiabilities });

  rows.push({ type: "spacer" });
  rows.push({ type: "divider", label: "Represented by:" });

  // Non-current Assets
  rows.push({ type: "section", label: "Non-current Assets" });
  rows.push(...flattenNodes(getRenderNodes(sections.nonCurrentAssets)));
  rows.push({ type: "subtotal", label: "Total Non-current Assets", amount: sections.totalNonCurrentAssets });

  rows.push({ type: "spacer" });

  // Current Assets
  rows.push({ type: "section", label: "Current Assets" });
  rows.push(...flattenNodes(getRenderNodes(sections.currentAssets)));
  rows.push({ type: "subtotal", label: "Total Current Assets", amount: sections.totalCurrentAssets });

  rows.push({ type: "spacer" });

  // Current Liabilities
  rows.push({ type: "section", label: "Less: Current Liabilities" });
  rows.push(...flattenNodes(getRenderNodes(sections.currentLiabilities)));
  rows.push({ type: "subtotal", label: "Total Current Liabilities", amount: sections.totalCurrentLiabilities });

  rows.push({ type: "spacer" });

  // Net Current Assets
  rows.push({ type: "subtotal", label: "Net Current Assets", amount: sections.netCurrentAssets });

  rows.push({ type: "spacer" });

  // Grand Total
  rows.push({ type: "grandtotal", label: "Total", amount: sections.grandTotal });

  return rows;
};

const generatePDF = (sections, formattedDate, asOfDate, orgName) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const accentColor = [194, 120, 3]; // warm amber/orange
  const headerBg = [245, 237, 220]; // light warm background
  const darkText = [33, 33, 33];
  const mediumText = [100, 100, 100];

  // Header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(orgName || "Fairy Wren Limited", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(14);
  doc.text("STATEMENT OF FINANCIAL POSITION", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mediumText);
  doc.text(`As at ${formattedDate}`, pageWidth / 2, 29, { align: "center" });
  doc.text("(Amounts in KES)", pageWidth / 2, 34, { align: "center" });

  // Build table data
  const pdfRows = buildPdfRows(sections);
  const tableBody = [];

  pdfRows.forEach((row) => {
    if (row.type === "spacer") {
      tableBody.push([{ content: "", colSpan: 2, styles: { cellPadding: { top: 1.5, bottom: 1.5 } } }]);
      return;
    }
    if (row.type === "divider") {
      tableBody.push([{
        content: row.label,
        colSpan: 2,
        styles: {
          fontStyle: "bold",
          fontSize: 8,
          textColor: mediumText,
          cellPadding: { top: 2, bottom: 2, left: 5 },
        },
      }]);
      return;
    }
    if (row.type === "section") {
      tableBody.push([{
        content: row.label,
        colSpan: 2,
        styles: {
          fontStyle: "bold",
          fontSize: 9.5,
          fillColor: headerBg,
          textColor: darkText,
          cellPadding: { top: 1.5, bottom: 1.5, left: 5 },
        },
      }]);
      return;
    }

    const indent = row.depth != null ? row.depth * 6 : 0;
    const amount = fmt(row.amount);

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

    // Regular line item
    tableBody.push([
      {
        content: row.label,
        styles: {
          fontStyle: row.italic ? "italic" : "normal",
          fontSize: 9,
          textColor: row.italic ? accentColor : mediumText,
          cellPadding: { top: 1, bottom: 1, left: 10 + indent },
        },
      },
      {
        content: amount,
        styles: {
          fontStyle: row.italic ? "italic" : "normal",
          fontSize: 9,
          halign: "right",
          textColor: row.italic ? accentColor : mediumText,
          cellPadding: { top: 1, bottom: 1, right: 5 },
        },
      },
    ]);
  });

  autoTable(doc, {
    startY: 40,
    head: [["Account", "KES"]],
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
      // Footer on each page
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

  doc.save(`balance-sheet-${asOfDate}.pdf`);
};

// --- Main Component ---

const BalanceSheetPage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [asOfDate, setAsOfDate] = useState(todayStr);
  const [drillDown, setDrillDown] = useState(null);
  const { data, isLoading, isFetching } = useBalanceSheet(asOfDate);
  const { data: settings } = useSettings();
  const orgName = settings?.organisation_name || "Fairy Wren Limited";

  const handleDrillDown = useCallback(
    (accountId, accountName) => {
      setDrillDown({ accountId, accountName, from: startDate, to: asOfDate });
    },
    [startDate, asOfDate],
  );

  const sections = useMemo(() => {
    if (!data?.accounts) return null;

    const currentAssets = data.accounts.filter((a) => a.account_class === "current_asset");
    const nonCurrentAssets = data.accounts.filter((a) => a.account_class === "non_current_asset");
    const genericAssets = data.accounts.filter((a) => a.account_class === "asset");
    const currentLiabilities = data.accounts.filter((a) => a.account_class === "current_liability");
    const nonCurrentLiabilities = data.accounts.filter((a) => a.account_class === "non_current_liability");
    const genericLiabilities = data.accounts.filter((a) => a.account_class === "liability");
    const equity = data.accounts.filter((a) => a.account_class === "equity");

    const currentAssetTree = buildTree([...currentAssets, ...genericAssets]);
    const nonCurrentAssetTree = buildTree(nonCurrentAssets);
    const currentLiabilityTree = buildTree([...currentLiabilities, ...genericLiabilities]);
    const nonCurrentLiabilityTree = buildTree(nonCurrentLiabilities);
    const equityTree = buildTree(equity);

    const netIncome = Number(data.netIncome ?? 0);

    const totalEquityAccounts = sumRoots(equityTree);
    const totalEquity = totalEquityAccounts + netIncome;

    const nonCurrentLiabRoots = nonCurrentLiabilityTree;
    const currentLiabRoots = currentLiabilityTree;
    const nonCurrentAssetRoots = nonCurrentAssetTree;
    const currentAssetRoots = currentAssetTree;

    const totalNonCurrentLiabilities = sumRoots(nonCurrentLiabRoots);
    const totalCurrentLiabilities = sumRoots(currentLiabRoots);
    const totalNonCurrentAssets = sumRoots(nonCurrentAssetRoots);
    const totalCurrentAssets = sumRoots(currentAssetRoots);

    const totalAssets = totalNonCurrentAssets + totalCurrentAssets;
    const totalLiabilities = totalNonCurrentLiabilities + totalCurrentLiabilities;
    const netCurrentAssets = totalCurrentAssets - totalCurrentLiabilities;
    const grandTotal = totalNonCurrentAssets + netCurrentAssets;

    return {
      equityTree,
      netIncome,
      totalEquity,
      nonCurrentLiabilities: nonCurrentLiabRoots,
      totalNonCurrentLiabilities,
      totalEquityAndNonCurrentLiabilities: totalEquity + totalNonCurrentLiabilities,
      nonCurrentAssets: nonCurrentAssetRoots,
      totalNonCurrentAssets,
      currentAssets: currentAssetRoots,
      totalCurrentAssets,
      currentLiabilities: currentLiabRoots,
      totalCurrentLiabilities,
      netCurrentAssets,
      grandTotal,
      totalAssets,
      totalLiabilities,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }, [data]);

  const formattedDate = new Date(asOfDate).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleDownloadPdf = useCallback(() => {
    if (sections) {
      generatePDF(sections, formattedDate, asOfDate, orgName);
    }
  }, [sections, formattedDate, asOfDate, orgName]);

  const inputCls = dateInputCls;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                Statement of Financial Position
              </h1>
              <p className="text-sm text-surface-400">As at {formattedDate}</p>
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
                As at
              </label>
              <input
                type="date"
                className={inputCls}
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            {sections && (
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
      ) : !data || !sections ? (
        <div className="py-16 text-center text-surface-500">
          <FileText size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date to generate the balance sheet</p>
        </div>
      ) : (
        <>
          {/* IAS 1 Statement Table */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Financed By:
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-48">
                      Amount (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {/* === EQUITY === */}
                  <CollapsibleSection
                    title="Equity"
                    nodes={getRenderNodes(sections.equityTree)}
                    subtotalLabel="Total Equity"
                    subtotalAmount={sections.totalEquity}
                    onDrillDown={handleDrillDown}
                  >
                    {/* Net Income row */}
                    <tr className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-4 py-2 text-amber-400 italic" style={{ paddingLeft: "40px" }}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-5" />
                          Retained Earnings (Net Income)
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-amber-400 italic">
                        {fmt(sections.netIncome)}
                      </td>
                    </tr>
                  </CollapsibleSection>

                  <SpacerRow />

                  {/* === NON-CURRENT LIABILITIES === */}
                  <CollapsibleSection
                    title="Non-current Liabilities"
                    nodes={getRenderNodes(sections.nonCurrentLiabilities)}
                    subtotalLabel="Total Non-current Liabilities"
                    subtotalAmount={sections.totalNonCurrentLiabilities}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === TOTAL EQUITY & NON-CURRENT LIABILITIES === */}
                  <GrandTotalRow
                    label="Total Equity and Non-current Liabilities"
                    amount={sections.totalEquityAndNonCurrentLiabilities}
                  />

                  <SpacerRow />

                  {/* --- Represented by --- */}
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-2 text-surface-400 font-semibold uppercase tracking-wider text-xs"
                    >
                      Represented by:
                    </td>
                  </tr>

                  {/* === NON-CURRENT ASSETS === */}
                  <CollapsibleSection
                    title="Non-current Assets"
                    nodes={getRenderNodes(sections.nonCurrentAssets)}
                    subtotalLabel="Total Non-current Assets"
                    subtotalAmount={sections.totalNonCurrentAssets}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === CURRENT ASSETS === */}
                  <CollapsibleSection
                    title="Current Assets"
                    nodes={getRenderNodes(sections.currentAssets)}
                    subtotalLabel="Total Current Assets"
                    subtotalAmount={sections.totalCurrentAssets}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === CURRENT LIABILITIES === */}
                  <CollapsibleSection
                    title="Less: Current Liabilities"
                    nodes={getRenderNodes(sections.currentLiabilities)}
                    subtotalLabel="Total Current Liabilities"
                    subtotalAmount={sections.totalCurrentLiabilities}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === NET CURRENT ASSETS === */}
                  <tr className="border-t border-surface-600">
                    <td className="px-4 py-2 font-semibold text-white" style={{ paddingLeft: "28px" }}>
                      Net Current Assets
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-white tabular-nums">
                      {fmt(sections.netCurrentAssets)}
                    </td>
                  </tr>

                  <SpacerRow />

                  {/* === GRAND TOTAL === */}
                  <GrandTotalRow label="Total" amount={sections.grandTotal} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Verification */}
          <div
            className={`border rounded-xl p-4 flex items-center justify-between ${
              sections.isBalanced
                ? "bg-emerald-900/20 border-emerald-700/50"
                : "bg-amber-900/20 border-amber-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {sections.isBalanced ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    sections.isBalanced ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {sections.isBalanced
                    ? "Balance Sheet is balanced"
                    : "Balance Sheet is out of balance"}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Assets ({fmt(sections.totalAssets)}) = Liabilities (
                  {fmt(sections.totalLiabilities)}) + Equity ({fmt(sections.totalEquity)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400">
                {sections.isBalanced ? "Equity + Non-current Liabilities" : "Difference"}
              </p>
              <p
                className={`font-bold ${
                  sections.isBalanced ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {sections.isBalanced
                  ? fmt(sections.totalEquityAndNonCurrentLiabilities)
                  : fmt(sections.totalAssets - (sections.totalLiabilities + sections.totalEquity))}
              </p>
            </div>
          </div>
        </>
      )}

      {drillDown && (
        <AccountLedgerModal
          accountId={drillDown.accountId}
          accountName={drillDown.accountName}
          from={drillDown.from}
          to={drillDown.to}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
};

export default BalanceSheetPage;

import { useState, useMemo, useCallback } from "react";
import { useIncomeStatement } from "@/hooks/useIncomeStatement";
import { dateInputCls } from "@/utils/constants";
import { useSettings } from "@/hooks/useSettings";
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNumber as fmt, localDateStr } from "@/utils/formatters";
import AccountLedgerModal from "@/components/shared/AccountLedgerModal";

const defaultEndDate = localDateStr();
const defaultStartDate = localDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

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
      // Exclude computed rows (Opening/Closing Inventory) from parent roll-up
      const childSum = node.children
        .filter((c) => !c.is_computed)
        .reduce((s, c) => s + Number(c.balance), 0);
      if (Number(node.balance) === 0) {
        node.balance = childSum;
      }
    }
  };
  roots.forEach(rollUp);

  return roots;
};

const getRenderNodes = (roots) => {
  if (roots.length === 1 && roots[0].children.length > 0) {
    return roots[0].children;
  }
  return roots;
};

const sumRoots = (roots) =>
  roots.reduce((s, n) => (n.is_computed ? s : s + Number(n.balance)), 0);

// --- Sub-components ---

const ComputedLineItem = ({ node, depth = 0 }) => {
  const balance = Number(node.balance);
  const isCredit = node.normal_balance === "credit";

  return (
    <tr className="hover:bg-surface-700/20 transition-colors">
      <td className="px-4 py-2 text-amber-400 italic">
        <div
          className="flex items-center gap-1.5"
          style={{ paddingLeft: `${(depth + 1) * 20}px` }}
        >
          <span className="w-5" />
          {node.account_name}
        </div>
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-amber-400 italic">
        {isCredit ? `(${fmt(balance)})` : fmt(balance)}
      </td>
    </tr>
  );
};

const LineItem = ({ node, depth = 0, onDrillDown }) => {
  const [expanded, setExpanded] = useState(!node.is_control_account);
  const hasChildren = node.children.length > 0;
  const balance = Number(node.balance);
  const isLeafWithBalance = !hasChildren && balance !== 0;

  if (node.is_computed) {
    return <ComputedLineItem node={node} depth={depth} />;
  }

  const balanceDisplay = !expanded || !hasChildren ? (
    isLeafWithBalance && onDrillDown ? (
      <button
        onClick={() => onDrillDown(node.account_id, node.account_name)}
        className="hover:text-primary-400 cursor-pointer underline decoration-dotted underline-offset-2 transition-colors"
      >
        {fmt(balance)}
      </button>
    ) : (
      fmt(balance)
    )
  ) : "";

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
          {balanceDisplay}
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

const CollapsibleSection = ({ title, nodes, subtotalLabel, subtotalAmount, onDrillDown }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <td colSpan={2} className="px-0 py-0">
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

      {!collapsed && (
        <>
          {nodes.map((node) => (
            <LineItem key={node.account_id} node={node} onDrillDown={onDrillDown} />
          ))}
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

const GrandTotalRow = ({ label, amount, positive }) => (
  <tr className="border-t-2 border-surface-500 bg-surface-900/50">
    <td className="px-4 py-3 font-bold text-white text-base">{label}</td>
    <td
      className={`px-4 py-3 text-right font-bold text-base tabular-nums border-b-2 border-surface-500 ${
        positive === false ? "text-red-400" : "text-white"
      }`}
    >
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
      type: node.is_computed ? "computed" : "line",
      label: node.account_name,
      amount: Number(node.balance),
      depth,
      isCredit: node.normal_balance === "credit",
    });
    if (node.children.length > 0) {
      rows.push(...flattenNodes(node.children, depth + 1));
    }
  });
  return rows;
};

const buildPdfRows = (sections) => {
  const rows = [];

  // Revenue
  rows.push({ type: "section", label: "Revenue" });
  rows.push(...flattenNodes(getRenderNodes(sections.revenueTree)));
  rows.push({ type: "subtotal", label: "Total Revenue", amount: sections.totalRevenue });

  rows.push({ type: "spacer" });

  // Cost of Sales
  rows.push({ type: "section", label: "Cost of Sales" });
  rows.push(...flattenNodes(getRenderNodes(sections.cogsTree)));
  rows.push({ type: "subtotal", label: "Total Cost of Sales", amount: sections.totalCOGS });

  rows.push({ type: "spacer" });

  // Gross Profit
  rows.push({ type: "grandtotal", label: "Gross Profit", amount: sections.grossProfit });

  rows.push({ type: "spacer" });

  // Operating Costs
  if (sections.totalOperatingCosts > 0) {
    rows.push({ type: "section", label: "Operating Costs" });
    rows.push(...flattenNodes(getRenderNodes(sections.operatingCostTree)));
    rows.push({ type: "subtotal", label: "Total Operating Costs", amount: sections.totalOperatingCosts });
    rows.push({ type: "spacer" });
  }

  // Administrative Costs
  if (sections.totalAdminCosts > 0) {
    rows.push({ type: "section", label: "Administrative Costs" });
    rows.push(...flattenNodes(getRenderNodes(sections.adminCostTree)));
    rows.push({ type: "subtotal", label: "Total Administrative Costs", amount: sections.totalAdminCosts });
    rows.push({ type: "spacer" });
  }

  // Other Expenses
  if (sections.totalOtherExpenses > 0) {
    rows.push({ type: "section", label: "Other Expenses" });
    rows.push(...flattenNodes(getRenderNodes(sections.otherExpenseTree)));
    rows.push({ type: "subtotal", label: "Total Other Expenses", amount: sections.totalOtherExpenses });
    rows.push({ type: "spacer" });
  }

  // Operating Profit
  rows.push({ type: "grandtotal", label: "Operating Profit", amount: sections.operatingProfit });

  // Finance Costs
  if (sections.totalFinanceCosts > 0) {
    rows.push({ type: "spacer" });
    rows.push({ type: "section", label: "Finance Costs" });
    rows.push(...flattenNodes(getRenderNodes(sections.financeCostTree)));
    rows.push({ type: "subtotal", label: "Total Finance Costs", amount: sections.totalFinanceCosts });
  }

  rows.push({ type: "spacer" });

  // Net Income
  rows.push({ type: "grandtotal", label: "Net Income", amount: sections.netIncome });

  // Margin
  if (sections.totalRevenue > 0) {
    rows.push({ type: "spacer" });
    rows.push({
      type: "line",
      label: "Gross Profit Margin",
      amount: null,
      depth: 0,
      suffix: `${((sections.grossProfit / sections.totalRevenue) * 100).toFixed(1)}%`,
    });
    rows.push({
      type: "line",
      label: "Net Profit Margin",
      amount: null,
      depth: 0,
      suffix: `${((sections.netIncome / sections.totalRevenue) * 100).toFixed(1)}%`,
    });
  }

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
  doc.text("INCOME STATEMENT", pageWidth / 2, 22, { align: "center" });

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

  pdfRows.forEach((row) => {
    if (row.type === "spacer") {
      tableBody.push([{ content: "", colSpan: 2, styles: { cellPadding: { top: 1.5, bottom: 1.5 } } }]);
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
    const amount = row.suffix || fmt(row.amount);

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

    const isComputed = row.type === "computed";
    const amberText = [194, 120, 3];

    tableBody.push([
      {
        content: row.label,
        styles: {
          fontSize: 9,
          fontStyle: isComputed ? "italic" : "normal",
          textColor: isComputed ? amberText : mediumText,
          cellPadding: { top: 1, bottom: 1, left: 10 + indent },
        },
      },
      {
        content: isComputed && row.isCredit ? `(${fmt(row.amount)})` : amount,
        styles: {
          fontSize: 9,
          fontStyle: isComputed ? "italic" : "normal",
          halign: "right",
          textColor: isComputed ? amberText : mediumText,
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

  doc.save(`income-statement-${startDate}-to-${endDate}.pdf`);
};

// --- Main Component ---

const IncomeStatementPage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const { data, isLoading, isFetching } = useIncomeStatement(startDate, endDate);
  const { data: settings } = useSettings();
  const orgName = settings?.organisation_name || "Fairy Wren Limited";
  const [drillDown, setDrillDown] = useState(null);

  const handleDrillDown = useCallback((accountId, accountName) => {
    setDrillDown({ accountId, accountName, from: startDate, to: endDate });
  }, [startDate, endDate]);

  const sections = useMemo(() => {
    if (!data?.accounts) return null;

    const revenue = data.accounts.filter((a) => a.account_class === "income");
    const cogs = data.accounts.filter((a) => a.account_class === "cost_of_sales");
    const operatingCosts = data.accounts.filter((a) => a.account_class === "operating_cost");
    const adminCosts = data.accounts.filter((a) => a.account_class === "admin_cost");
    const financeCosts = data.accounts.filter((a) => a.account_class === "finance_cost");
    const otherExpenses = data.accounts.filter((a) => a.account_class === "expense");

    const revenueTree = buildTree(revenue);
    const cogsTree = buildTree(cogs);
    const operatingCostTree = buildTree(operatingCosts);
    const adminCostTree = buildTree(adminCosts);
    const financeCostTree = buildTree(financeCosts);
    const otherExpenseTree = buildTree(otherExpenses);

    const totalRevenue = sumRoots(revenueTree);
    const totalCOGS = sumRoots(cogsTree);
    const totalOperatingCosts = sumRoots(operatingCostTree);
    const totalAdminCosts = sumRoots(adminCostTree);
    const totalFinanceCosts = sumRoots(financeCostTree);
    const totalOtherExpenses = sumRoots(otherExpenseTree);
    const grossProfit = totalRevenue - totalCOGS;
    const totalExpenses = totalOperatingCosts + totalAdminCosts + totalOtherExpenses;
    const operatingProfit = grossProfit - totalExpenses;
    const netIncome = operatingProfit - totalFinanceCosts;

    return {
      revenueTree,
      cogsTree,
      operatingCostTree,
      adminCostTree,
      financeCostTree,
      otherExpenseTree,
      totalRevenue,
      totalCOGS,
      totalOperatingCosts,
      totalAdminCosts,
      totalFinanceCosts,
      totalOtherExpenses,
      totalExpenses,
      grossProfit,
      operatingProfit,
      netIncome,
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

  const summaryCards = sections
    ? [
        {
          label: "Total Revenue",
          value: sections.totalRevenue,
          color: "text-emerald-400",
        },
        {
          label: "Gross Profit",
          value: sections.grossProfit,
          color: sections.grossProfit >= 0 ? "text-primary-400" : "text-red-400",
          sub:
            sections.totalRevenue > 0
              ? `${((sections.grossProfit / sections.totalRevenue) * 100).toFixed(1)}% margin`
              : null,
        },
        {
          label: "Net Income",
          value: sections.netIncome,
          color: sections.netIncome >= 0 ? "text-emerald-400" : "text-red-400",
          sub:
            sections.totalRevenue > 0
              ? `${((sections.netIncome / sections.totalRevenue) * 100).toFixed(1)}% margin`
              : null,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Income Statement</h1>
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
          <TrendingUp size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date range to generate the income statement</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="bg-surface-800/50 border border-surface-700 rounded-xl p-4"
              >
                <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
                  {card.label}
                </p>
                <p className={`text-xl font-bold ${card.color}`}>
                  {fmt(card.value)}
                </p>
                {card.sub && (
                  <p className="text-xs text-surface-500 mt-1">{card.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Income Statement Table */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-48">
                      Amount (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {/* === REVENUE === */}
                  <CollapsibleSection
                    title="Revenue"
                    nodes={getRenderNodes(sections.revenueTree)}
                    subtotalLabel="Total Revenue"
                    subtotalAmount={sections.totalRevenue}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === COST OF SALES === */}
                  <CollapsibleSection
                    title="Cost of Sales"
                    nodes={getRenderNodes(sections.cogsTree)}
                    subtotalLabel="Total Cost of Sales"
                    subtotalAmount={sections.totalCOGS}
                    onDrillDown={handleDrillDown}
                  />

                  <SpacerRow />

                  {/* === GROSS PROFIT === */}
                  <GrandTotalRow
                    label="Gross Profit"
                    amount={sections.grossProfit}
                    positive={sections.grossProfit >= 0}
                  />

                  {/* === OPERATING COSTS === */}
                  {sections.totalOperatingCosts > 0 && (
                    <>
                      <SpacerRow />
                      <CollapsibleSection
                        title="Operating Costs"
                        nodes={getRenderNodes(sections.operatingCostTree)}
                        subtotalLabel="Total Operating Costs"
                        subtotalAmount={sections.totalOperatingCosts}
                        onDrillDown={handleDrillDown}
                      />
                    </>
                  )}

                  {/* === ADMINISTRATIVE COSTS === */}
                  {sections.totalAdminCosts > 0 && (
                    <>
                      <SpacerRow />
                      <CollapsibleSection
                        title="Administrative Costs"
                        nodes={getRenderNodes(sections.adminCostTree)}
                        subtotalLabel="Total Administrative Costs"
                        subtotalAmount={sections.totalAdminCosts}
                        onDrillDown={handleDrillDown}
                      />
                    </>
                  )}

                  {/* === OTHER EXPENSES === */}
                  {sections.totalOtherExpenses > 0 && (
                    <>
                      <SpacerRow />
                      <CollapsibleSection
                        title="Other Expenses"
                        nodes={getRenderNodes(sections.otherExpenseTree)}
                        subtotalLabel="Total Other Expenses"
                        subtotalAmount={sections.totalOtherExpenses}
                        onDrillDown={handleDrillDown}
                      />
                    </>
                  )}

                  <SpacerRow />

                  {/* === OPERATING PROFIT === */}
                  <GrandTotalRow
                    label="Operating Profit"
                    amount={sections.operatingProfit}
                    positive={sections.operatingProfit >= 0}
                  />

                  {/* === FINANCE COSTS === */}
                  {sections.totalFinanceCosts > 0 && (
                    <>
                      <SpacerRow />
                      <CollapsibleSection
                        title="Finance Costs"
                        nodes={getRenderNodes(sections.financeCostTree)}
                        subtotalLabel="Total Finance Costs"
                        subtotalAmount={sections.totalFinanceCosts}
                        onDrillDown={handleDrillDown}
                      />
                    </>
                  )}

                  <SpacerRow />

                  {/* === NET INCOME === */}
                  <GrandTotalRow
                    label="Net Income"
                    amount={sections.netIncome}
                    positive={sections.netIncome >= 0}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Margin Summary */}
          {sections.totalRevenue > 0 && (
            <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
              <p className="text-xs text-surface-400 uppercase tracking-wider mb-3 font-semibold">
                Profitability Ratios
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-surface-400">Gross Profit Margin</p>
                  <p className="text-lg font-bold text-white">
                    {((sections.grossProfit / sections.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-400">Operating Profit Margin</p>
                  <p className="text-lg font-bold text-white">
                    {((sections.operatingProfit / sections.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-400">Net Profit Margin</p>
                  <p className="text-lg font-bold text-white">
                    {((sections.netIncome / sections.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-400">Cost of Sales Ratio</p>
                  <p className="text-lg font-bold text-white">
                    {((sections.totalCOGS / sections.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
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

export default IncomeStatementPage;

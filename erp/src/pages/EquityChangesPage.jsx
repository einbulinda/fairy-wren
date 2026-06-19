import { useState, useMemo, useCallback } from "react";
import { useEquityChanges } from "@/hooks/useEquityChanges";
import { useSettings } from "@/hooks/useSettings";
import { Scale, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNumber as fmt, fmt as fmtCurrency, fmtDate, localDateStr } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";

const defaultEndDate = localDateStr();
const defaultStartDate = localDateStr(new Date(new Date().getFullYear(), 0, 1));

// --- PDF Generation ---

const generatePDF = (accounts, netIncome, startDate, endDate, orgName) => {
  const doc = new jsPDF("l", "mm", "a4"); // landscape for columnar layout
  const pageWidth = doc.internal.pageSize.getWidth();

  const accentColor = [194, 120, 3];
  const darkText = [33, 33, 33];
  const mediumText = [100, 100, 100];
  const headerBg = [245, 237, 220];

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(orgName || "Fairy Wren Limited", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(14);
  doc.text("STATEMENT OF CHANGES IN EQUITY", pageWidth / 2, 19, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mediumText);
  doc.text(
    `For the period ${fmtDate(startDate)} to ${fmtDate(endDate)}`,
    pageWidth / 2,
    26,
    { align: "center" }
  );
  doc.text("(Amounts in KES)", pageWidth / 2, 31, { align: "center" });

  const fmtPdf = (n) =>
    Number(n) < 0 ? `(${fmt(Math.abs(n))})` : fmt(n);

  // Build columns: Description | Account1 | Account2 | ... | Retained Earnings | Total
  const colHeaders = ["Description"];
  accounts.forEach((a) => colHeaders.push(a.account_name));
  colHeaders.push("Retained Earnings", "Total");

  const rows = [];

  // Opening Balance
  const openingRow = ["Opening Balance"];
  let openingTotal = 0;
  accounts.forEach((a) => {
    openingRow.push(fmtPdf(a.opening_balance));
    openingTotal += Number(a.opening_balance);
  });
  openingRow.push(fmtPdf(netIncome.opening)); // retained earnings opening
  openingTotal += Number(netIncome.opening);
  openingRow.push(fmtPdf(openingTotal));
  rows.push(openingRow);

  // Contributions
  const contribRow = ["Capital Contributions"];
  let contribTotal = 0;
  accounts.forEach((a) => {
    const val = Number(a.contributions);
    contribRow.push(val > 0 ? fmtPdf(val) : "—");
    contribTotal += val;
  });
  contribRow.push("—"); // retained earnings
  contribRow.push(fmtPdf(contribTotal));
  rows.push(contribRow);

  // Drawings
  const drawRow = ["Drawings / Distributions"];
  let drawTotal = 0;
  accounts.forEach((a) => {
    const val = Number(a.drawings);
    drawRow.push(val > 0 ? fmtPdf(-val) : "—");
    drawTotal += val;
  });
  drawRow.push("—");
  drawRow.push(fmtPdf(-drawTotal));
  rows.push(drawRow);

  // Net Income
  const niRow = ["Net Income for the Period"];
  accounts.forEach(() => niRow.push("—"));
  const periodNI = Number(netIncome.closing) - Number(netIncome.opening);
  niRow.push(fmtPdf(periodNI));
  niRow.push(fmtPdf(periodNI));
  rows.push(niRow);

  // Closing Balance
  const closingRow = ["Closing Balance"];
  let closingTotal = 0;
  accounts.forEach((a) => {
    closingRow.push(fmtPdf(a.closing_balance));
    closingTotal += Number(a.closing_balance);
  });
  closingRow.push(fmtPdf(Number(netIncome.closing)));
  closingTotal += Number(netIncome.closing);
  closingRow.push(fmtPdf(closingTotal));
  rows.push(closingRow);

  const columnStyles = { 0: { cellWidth: 50, fontStyle: "bold" } };
  const colCount = colHeaders.length;
  for (let i = 1; i < colCount; i++) {
    columnStyles[i] = { halign: "right", cellWidth: "auto" };
  }

  autoTable(doc, {
    startY: 37,
    head: [colHeaders],
    body: rows,
    theme: "plain",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "right",
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
    },
    columnStyles,
    styles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 3, right: 3 } },
    didParseCell: (data) => {
      // Bold first column and last two rows
      if (data.section === "head" && data.column.index === 0) {
        data.cell.styles.halign = "left";
      }
      if (data.section === "body" && (data.row.index === 0 || data.row.index === rows.length - 1)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = headerBg;
      }
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" })}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
      doc.text(`Page ${data.pageNumber}`, pageWidth - 10, pageHeight - 8, { align: "right" });
    },
  });

  doc.save(`statement-of-changes-in-equity-${startDate}-to-${endDate}.pdf`);
};

// --- Main Component ---

const EquityChangesPage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const { data, isLoading, isFetching } = useEquityChanges(startDate, endDate);
  const { data: settings } = useSettings();
  const orgName = settings?.organisation_name || "Fairy Wren Limited";

  const computed = useMemo(() => {
    if (!data?.accounts) return null;

    const accounts = data.accounts;
    const openingNetIncome = Number(data.openingNetIncome ?? 0);
    const closingNetIncome = Number(data.closingNetIncome ?? 0);
    const periodNetIncome = closingNetIncome - openingNetIncome;

    let totalOpening = 0;
    let totalContributions = 0;
    let totalDrawings = 0;
    let totalClosing = 0;

    accounts.forEach((a) => {
      totalOpening += Number(a.opening_balance);
      totalContributions += Number(a.contributions);
      totalDrawings += Number(a.drawings);
      totalClosing += Number(a.closing_balance);
    });

    // Add retained earnings (net income) to totals
    totalOpening += openingNetIncome;
    totalClosing += closingNetIncome;

    return {
      accounts,
      netIncome: { opening: openingNetIncome, closing: closingNetIncome, period: periodNetIncome },
      totalOpening,
      totalContributions,
      totalDrawings,
      totalClosing,
      totalNetChange: totalClosing - totalOpening,
    };
  }, [data]);

  const handleDownloadPdf = useCallback(() => {
    if (computed) {
      generatePDF(computed.accounts, computed.netIncome, startDate, endDate, orgName);
    }
  }, [computed, startDate, endDate, orgName]);

  const inputCls = dateInputCls;

  const cellCls = "px-3 py-2.5 text-right tabular-nums text-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <Scale size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                Statement of Changes in Equity
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
            {computed && (
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
      {computed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Opening Equity
            </p>
            <p className={`text-xl font-bold ${computed.totalOpening >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtCurrency(computed.totalOpening)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Closing Equity
            </p>
            <p className={`text-xl font-bold ${computed.totalClosing >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtCurrency(computed.totalClosing)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">
              Net Change
            </p>
            <p className={`text-xl font-bold ${computed.totalNetChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {computed.totalNetChange < 0
                ? `(${fmtCurrency(Math.abs(computed.totalNetChange))})`
                : fmtCurrency(computed.totalNetChange)}
            </p>
          </div>
        </div>
      )}

      {/* Loading / Empty / Table */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !computed ? (
        <div className="py-16 text-center text-surface-500">
          <Scale size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date range to generate the statement</p>
        </div>
      ) : (
        <>
          <p className="sm:hidden text-xs text-surface-500 text-center -mb-1">
            Rotate to landscape for a better view of this statement
          </p>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider sticky left-0 bg-surface-900/50">
                      Description
                    </th>
                    {computed.accounts.map((a) => (
                      <th
                        key={a.account_id}
                        className="px-3 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {a.account_name}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">
                      Retained Earnings
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-primary-400 uppercase tracking-wider whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {/* Opening Balance */}
                  <tr className="bg-surface-900/30">
                    <td className="px-4 py-2.5 font-semibold text-white sticky left-0 bg-surface-900/30">
                      Opening Balance
                    </td>
                    {computed.accounts.map((a) => (
                      <td key={a.account_id} className={`${cellCls} text-white font-medium`}>
                        {fmt(a.opening_balance)}
                      </td>
                    ))}
                    <td className={`${cellCls} text-white font-medium`}>
                      {fmt(computed.netIncome.opening)}
                    </td>
                    <td className={`${cellCls} text-white font-bold`}>
                      {fmt(computed.totalOpening)}
                    </td>
                  </tr>

                  {/* Capital Contributions */}
                  <tr className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-4 py-2.5 text-surface-300 pl-6 sticky left-0 bg-surface-800/50">
                      Capital Contributions
                    </td>
                    {computed.accounts.map((a) => {
                      const val = Number(a.contributions);
                      return (
                        <td key={a.account_id} className={`${cellCls} text-emerald-400`}>
                          {val > 0 ? fmt(val) : "—"}
                        </td>
                      );
                    })}
                    <td className={`${cellCls} text-surface-500`}>—</td>
                    <td className={`${cellCls} text-emerald-400 font-medium`}>
                      {computed.totalContributions > 0 ? fmt(computed.totalContributions) : "—"}
                    </td>
                  </tr>

                  {/* Drawings */}
                  <tr className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-4 py-2.5 text-surface-300 pl-6 sticky left-0 bg-surface-800/50">
                      Drawings / Distributions
                    </td>
                    {computed.accounts.map((a) => {
                      const val = Number(a.drawings);
                      return (
                        <td key={a.account_id} className={`${cellCls} text-red-400`}>
                          {val > 0 ? `(${fmt(val)})` : "—"}
                        </td>
                      );
                    })}
                    <td className={`${cellCls} text-surface-500`}>—</td>
                    <td className={`${cellCls} text-red-400 font-medium`}>
                      {computed.totalDrawings > 0 ? `(${fmt(computed.totalDrawings)})` : "—"}
                    </td>
                  </tr>

                  {/* Net Income */}
                  <tr className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-4 py-2.5 text-surface-300 pl-6 sticky left-0 bg-surface-800/50">
                      Net Income for the Period
                    </td>
                    {computed.accounts.map((a) => (
                      <td key={a.account_id} className={`${cellCls} text-surface-500`}>
                        —
                      </td>
                    ))}
                    <td className={`${cellCls} ${computed.netIncome.period >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {computed.netIncome.period < 0
                        ? `(${fmt(Math.abs(computed.netIncome.period))})`
                        : fmt(computed.netIncome.period)}
                    </td>
                    <td className={`${cellCls} font-medium ${computed.netIncome.period >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {computed.netIncome.period < 0
                        ? `(${fmt(Math.abs(computed.netIncome.period))})`
                        : fmt(computed.netIncome.period)}
                    </td>
                  </tr>

                  {/* Closing Balance */}
                  <tr className="bg-primary-900/20 border-t-2 border-primary-600/50">
                    <td className="px-4 py-3 font-bold text-white sticky left-0 bg-primary-900/20">
                      Closing Balance
                    </td>
                    {computed.accounts.map((a) => (
                      <td key={a.account_id} className={`${cellCls} text-white font-bold`}>
                        {fmt(a.closing_balance)}
                      </td>
                    ))}
                    <td className={`${cellCls} text-white font-bold`}>
                      {fmt(computed.netIncome.closing)}
                    </td>
                    <td className={`${cellCls} text-white font-bold`}>
                      {fmt(computed.totalClosing)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification */}
          {(() => {
            const expectedClosing = computed.totalOpening + computed.totalContributions - computed.totalDrawings + computed.netIncome.period;
            const balanced = Math.abs(computed.totalClosing - expectedClosing) < 0.01;
            return (
              <div
                className={`border rounded-xl p-4 flex items-center justify-between ${
                  balanced
                    ? "bg-emerald-900/20 border-emerald-700/50"
                    : "bg-amber-900/20 border-amber-700/50"
                }`}
              >
                <div>
                  <p className={`font-semibold text-sm ${balanced ? "text-emerald-400" : "text-amber-400"}`}>
                    {balanced ? "Balance Verified" : "Balance Discrepancy"}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Opening ({fmt(computed.totalOpening)}) + Contributions ({fmt(computed.totalContributions)})
                    {" "}- Drawings ({fmt(computed.totalDrawings)}) + Net Income (
                    {computed.netIncome.period < 0
                      ? `(${fmt(Math.abs(computed.netIncome.period))})`
                      : fmt(computed.netIncome.period)}
                    ) = Closing ({fmt(computed.totalClosing)})
                  </p>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default EquityChangesPage;

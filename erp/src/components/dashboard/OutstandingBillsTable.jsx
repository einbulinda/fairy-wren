import { useState, useMemo } from "react";
import { Clock, Search, Download, X } from "lucide-react";
import * as XLSX from "xlsx";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import PaginatedTable from "@/components/shared/PaginatedTable";
import { fmtDate, localDateStr } from "@/utils/formatters";

const fmtAmt = (n) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0);

const getDaysColor = (days) => {
  if (days >= 30) return "text-red-400";
  if (days >= 14) return "text-orange-400";
  if (days >= 7) return "text-yellow-400";
  return "text-surface-400";
};

const calcDays = (createdAt) =>
  Math.ceil(Math.abs(new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));

const OutstandingBillsTable = ({ data }) => {
  const [search, setSearch] = useState("");

  const enhancedData = useMemo(
    () =>
      (data || []).map((item) => ({
        ...item,
        days_outstanding: calcDays(item.created_at),
        customer_name: item.customer_name || item.customer?.name || "Walk-in Customer",
        served_by: item.served_by || item.user?.name || "Unknown",
        balance: (parseFloat(item.bill_total) || 0) - (parseFloat(item.paid_amount) || 0),
      })),
    [data],
  );

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return enhancedData;
    return enhancedData.filter(
      (b) =>
        b.customer_name.toLowerCase().includes(q) ||
        b.served_by.toLowerCase().includes(q),
    );
  }, [enhancedData, search]);

  const totals = useMemo(
    () => ({
      billTotal: filteredData.reduce((s, b) => s + parseFloat(b.bill_total || 0), 0),
      paid: filteredData.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0),
      balance: filteredData.reduce((s, b) => s + b.balance, 0),
    }),
    [filteredData],
  );

  const exportToExcel = () => {
    const rows = filteredData.map((b) => ({
      Customer: b.customer_name,
      Staff: b.served_by,
      Date: fmtDate(b.created_at),
      "Days Outstanding": b.days_outstanding,
      "Bill Total (KES)": parseFloat(b.bill_total || 0),
      "Paid Amount (KES)": parseFloat(b.paid_amount || 0),
      "Balance (KES)": b.balance,
    }));
    rows.push({
      Customer: "TOTALS",
      Staff: "",
      Date: "",
      "Days Outstanding": "",
      "Bill Total (KES)": totals.billTotal,
      "Paid Amount (KES)": totals.paid,
      "Balance (KES)": totals.balance,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Outstanding Bills");
    XLSX.writeFile(wb, `outstanding-bills-${localDateStr()}.xlsx`);
  };

  const columns = [
    {
      key: "customer_name",
      label: "Customer",
      sortable: true,
      cellClassName: "text-white font-medium",
    },
    {
      key: "served_by",
      label: "Staff",
      sortable: true,
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-surface-300",
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      cellClassName: "text-surface-300",
      sortFn: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (val) => fmtDate(val),
    },
    {
      key: "days_outstanding",
      label: "Days Out",
      sortable: true,
      align: "right",
      render: (val) => (
        <div className="flex items-center justify-end gap-1">
          <Clock className={`w-3 h-3 ${getDaysColor(val)}`} />
          <span className={`font-semibold tabular-nums ${getDaysColor(val)}`}>{val}</span>
        </div>
      ),
    },
    {
      key: "bill_total",
      label: "Bill Total",
      sortable: true,
      align: "right",
      cellClassName: "text-surface-300 tabular-nums",
      sortFn: (a, b) => parseFloat(a.bill_total || 0) - parseFloat(b.bill_total || 0),
      render: (val) => fmtAmt(parseFloat(val || 0)),
    },
    {
      key: "paid_amount",
      label: "Paid",
      sortable: true,
      align: "right",
      cellClassName: "text-emerald-400 tabular-nums",
      sortFn: (a, b) => parseFloat(a.paid_amount || 0) - parseFloat(b.paid_amount || 0),
      render: (val) => fmtAmt(parseFloat(val || 0)),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      align: "right",
      sortFn: (a, b) => a.balance - b.balance,
      render: (val) => (
        <span
          className={`font-semibold tabular-nums ${val > 0 ? "text-red-400" : "text-surface-400"}`}
        >
          {fmtAmt(val)}
        </span>
      ),
    },
  ];

  const footer = (
    <tr className="font-bold">
      <td
        className="px-4 py-3 text-surface-400 text-xs uppercase tracking-wide"
        colSpan={4}
      >
        Totals — {filteredData.length} bill{filteredData.length !== 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3 text-right text-surface-300 tabular-nums">
        {fmtAmt(totals.billTotal)}
      </td>
      <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
        {fmtAmt(totals.paid)}
      </td>
      <td className="px-4 py-3 text-right text-red-400 tabular-nums">
        {fmtAmt(totals.balance)}
      </td>
    </tr>
  );

  if (!data || data.length === 0)
    return (
      <div className="text-center py-8 text-surface-400">No outstanding bills</div>
    );

  return (
    <div className="space-y-3">
      {/* Search + Export */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
          />
          <input
            type="text"
            placeholder="Search by customer or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={exportToExcel}
          disabled={filteredData.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          <Download size={14} />
          Excel
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <PaginatedTable
          columns={columns}
          data={filteredData}
          rowKey="bill_id"
          defaultSort={{ key: "days_outstanding", dir: "desc" }}
          defaultPageSize={10}
          emptyMessage="No bills match your search"
          footer={footer}
        />
      </div>

      {/* Mobile cards */}
      <MobileCardList>
        {filteredData.map((bill, index) => (
          <MobileCard key={bill.bill_id || index}>
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm">{bill.customer_name}</span>
              <div className="flex items-center gap-1">
                <Clock className={`w-3 h-3 ${getDaysColor(bill.days_outstanding)}`} />
                <span
                  className={`text-xs font-semibold ${getDaysColor(bill.days_outstanding)}`}
                >
                  {bill.days_outstanding}d
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-surface-400">{fmtDate(bill.created_at)}</span>
              <span className="text-surface-400">{bill.served_by}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="space-x-2">
                <span className="text-surface-300 tabular-nums">
                  {fmtAmt(parseFloat(bill.bill_total || 0))}
                </span>
                <span className="text-emerald-400 text-xs tabular-nums">
                  Paid {fmtAmt(parseFloat(bill.paid_amount || 0))}
                </span>
              </div>
              <span
                className={`font-semibold tabular-nums ${bill.balance > 0 ? "text-red-400" : "text-surface-400"}`}
              >
                {fmtAmt(bill.balance)}
              </span>
            </div>
          </MobileCard>
        ))}
      </MobileCardList>
    </div>
  );
};

export default OutstandingBillsTable;

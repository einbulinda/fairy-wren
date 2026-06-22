import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Receipt,
  Download,
  ChevronRight,
  Search,
  Loader2,
  DollarSign,
  FileText,
  PercentCircle,
  XCircle,
  Package,
  Printer,
  X,
} from "lucide-react";
import { useBills } from "@/hooks/useBills";
import * as XLSX from "xlsx";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import PaginatedTable from "@/components/shared/PaginatedTable";
import { fmtNumber as fmt, fmtDate, localDateStr } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";
import ZReportTab from "@/components/reports/ZReportTab";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultStartDate = localDateStr(yesterday);
const defaultEndDate = defaultStartDate;

const toISO = localDateStr;
const getDatePreset = (key) => {
  const today = new Date();
  const d = (offset) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offset);
    return dt;
  };
  switch (key) {
    case "today":
      return [toISO(today), toISO(today)];
    case "yesterday":
      return [toISO(d(-1)), toISO(d(-1))];
    case "this_week": {
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
      return [toISO(start), toISO(today)];
    }
    case "last_week": {
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - diffToMonday);
      const end = new Date(thisMonday);
      end.setDate(thisMonday.getDate() - 1); // last Sunday
      const start = new Date(end);
      start.setDate(end.getDate() - 6); // last Monday
      return [toISO(start), toISO(end)];
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return [toISO(start), toISO(today)];
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return [toISO(start), toISO(end)];
    }
    default:
      return null;
  }
};

const STATUS_TABS = [
  { key: "all", label: "All", short: "All" },
  { key: "open", label: "Open", short: "Open" },
  { key: "completed", label: "Closed", short: "Closed" },
  { key: "void", label: "Void", short: "Void" },
  { key: "products", label: "Product Sales", short: "Products" },
  { key: "z-report", label: "Z-Report", short: "Z-Rep" },
];

const STATUS_BADGE = {
  open: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  void: "bg-red-500/20 text-red-400",
  awaiting_confirmation: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-surface-600/30 text-surface-400",
};

const STATUS_LABEL = {
  open: "Open",
  completed: "Closed",
  void: "Void",
  awaiting_confirmation: "Pending",
  cancelled: "Cancelled",
};

const computeBillTotal = (bill) =>
  bill.rounds?.reduce(
    (sum, round) =>
      sum +
      (round.round_items?.reduce(
        (rSum, item) =>
          rSum + (item.is_return ? -1 : 1) * item.quantity * item.price,
        0,
      ) || 0),
    0,
  ) || 0;

const computeItemCount = (bill) =>
  bill.rounds?.reduce(
    (sum, round) => sum + (round.round_items?.length || 0),
    0,
  ) || 0;

const computePaidAmount = (bill) =>
  (bill.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

const computeOutstanding = (bill) =>
  Math.max(0, computeBillTotal(bill) - computePaidAmount(bill));

const SalesPage = () => {
  const [urlParams, setUrlParams] = useSearchParams();
  const statusFilter = urlParams.get("status") || "all";
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [quickSelect, setQuickSelect] = useState("");
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [expandedBill, setExpandedBill] = useState(null);

  const params = useMemo(() => {
    const p = { startDate, endDate };
    if (
      statusFilter !== "all" &&
      statusFilter !== "products" &&
      statusFilter !== "z-report"
    )
      p.status = statusFilter;
    return p;
  }, [startDate, endDate, statusFilter]);

  const { data, isLoading } = useBills(params);
  const bills = useMemo(() => data?.bills ?? [], [data]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase();
    return bills.filter(
      (b) =>
        b.customer_name?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q),
    );
  }, [bills, search]);

  // Summary stats from full list
  const stats = useMemo(() => {
    const total = bills.length;
    const revenue = bills
      .filter((b) => b.status !== "void")
      .reduce((s, b) => s + computeBillTotal(b), 0);
    const completed = bills.filter((b) => b.status === "completed").length;
    const voided = bills.filter(
      (b) => b.status === "void" && computeItemCount(b) > 0,
    ).length;
    const outstanding = bills.filter(
      (b) => b.status === "open" || b.status === "awaiting_confirmation",
    );
    const outstandingAmount = outstanding.reduce(
      (s, b) => s + computeBillTotal(b),
      0,
    );
    return {
      total,
      revenue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      voidRate: total > 0 ? Math.round((voided / total) * 100) : 0,
      outstandingCount: outstanding.length,
      outstandingAmount,
    };
  }, [bills]);

  // Product sales summary
  const productSales = useMemo(() => {
    const map = {};
    for (const bill of bills) {
      if (bill.status === "void") continue;
      for (const round of bill.rounds || []) {
        for (const item of round.round_items || []) {
          const key = item.product?.id || item.product_id || item.product?.name || "Unknown";
          const name = item.product?.name || "Unknown";
          if (!map[key]) map[key] = { name, quantity: 0, value: 0, totalCost: 0 };
          map[key].quantity += item.quantity;
          map[key].value += item.quantity * item.price;
          map[key].totalCost += item.quantity * (item.product?.cost_price || 0);
        }
      }
    }
    const list = Object.values(map).map((p) => {
      const avgUnitPrice = p.quantity > 0 ? p.value / p.quantity : 0;
      const avgUnitCost = p.quantity > 0 ? p.totalCost / p.quantity : 0;
      const gpPerUnit = avgUnitPrice - avgUnitCost;
      const contributionMargin = avgUnitPrice > 0 ? (gpPerUnit / avgUnitPrice) * 100 : 0;
      const totalGP = gpPerUnit * p.quantity;
      return { ...p, avgUnitPrice, avgUnitCost, gpPerUnit, contributionMargin, totalGP };
    }).sort((a, b) => b.value - a.value);
    const grandTotal = list.reduce((s, p) => s + p.value, 0);
    const grandQty = list.reduce((s, p) => s + p.quantity, 0);
    const grandGP = list.reduce((s, p) => s + p.totalGP, 0);
    return { items: list, grandTotal, grandQty, grandGP };
  }, [bills]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return productSales.items;
    const q = productSearch.toLowerCase();
    return productSales.items.filter((p) => p.name.toLowerCase().includes(q));
  }, [productSales.items, productSearch]);

  const handleStatusChange = (key) => {
    setUrlParams({ status: key });
  };

  // Excel export
  const exportToExcel = () => {
    const rows = filtered.map((bill) => ({
      Customer: bill.customer_name || "Walk-in",
      Status: STATUS_LABEL[bill.status] || bill.status,
      Items: computeItemCount(bill),
      "Bill Total": computeBillTotal(bill),
      "Paid Amount": computePaidAmount(bill),
      Outstanding: computeOutstanding(bill),
      "Created By": bill.created_by_user?.name || "—",
      Date: fmtDate(bill.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, `bills-${startDate}-to-${endDate}.xlsx`);
  };

  const exportProductsToExcel = () => {
    const rows = filteredProducts.map((p, idx) => ({
      "#": idx + 1,
      "Product": p.name,
      "Qty Sold": p.quantity,
      "Unit Sale Price": p.avgUnitPrice,
      "Unit Avg Cost": p.avgUnitCost,
      "GP / Unit": p.gpPerUnit,
      "Margin %": p.contributionMargin.toFixed(2) + "%",
      "Total Sales": p.value,
      "Total GP": p.totalGP,
    }));
    rows.push({
      "#": "",
      "Product": "TOTALS",
      "Qty Sold": filteredProducts.reduce((s, p) => s + p.quantity, 0),
      "Unit Sale Price": "",
      "Unit Avg Cost": "",
      "GP / Unit": "",
      "Margin %": "",
      "Total Sales": filteredProducts.reduce((s, p) => s + p.value, 0),
      "Total GP": filteredProducts.reduce((s, p) => s + p.totalGP, 0),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product Sales");
    XLSX.writeFile(wb, `product-sales-${startDate}-to-${endDate}.xlsx`);
  };

  const inputCls = dateInputCls;

  // -- Column definitions --

  const billColumns = [
    {
      key: "customer_name",
      label: "Customer",
      render: (_val, row) => {
        const isExpanded = expandedBill === row.id;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            >
              <ChevronRight size={14} className="text-surface-500" />
            </span>
            <span className="text-white font-medium">
              {row.customer_name || "Walk-in"}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_val, row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || "bg-surface-600/30 text-surface-400"}`}
        >
          {STATUS_LABEL[row.status] || row.status}
        </span>
      ),
    },
    {
      key: "items",
      label: "Items",
      align: "right",
      cellClassName: "text-surface-300",
      render: (_val, row) => computeItemCount(row),
    },
    {
      key: "total",
      label: "Bill Total",
      align: "right",
      sortable: true,
      cellClassName: "text-white font-medium tabular-nums",
      sortFn: (a, b) => computeBillTotal(a) - computeBillTotal(b),
      render: (_val, row) => fmt(computeBillTotal(row)),
    },
    {
      key: "paid_amount",
      label: "Paid Amount",
      align: "right",
      sortable: true,
      cellClassName: "text-emerald-400 tabular-nums",
      sortFn: (a, b) => computePaidAmount(a) - computePaidAmount(b),
      render: (_val, row) => fmt(computePaidAmount(row)),
    },
    {
      key: "outstanding",
      label: "Outstanding",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      sortFn: (a, b) => computeOutstanding(a) - computeOutstanding(b),
      render: (_val, row) => {
        const amt = computeOutstanding(row);
        return (
          <span className={amt > 0 ? "text-amber-400 font-medium" : "text-surface-500"}>
            {fmt(amt)}
          </span>
        );
      },
    },
    {
      key: "created_by",
      label: "Created By",
      sortable: true,
      headerClassName: "hidden lg:table-cell",
      cellClassName: "text-surface-300 hidden lg:table-cell",
      sortFn: (a, b) =>
        (a.created_by_user?.name || "").localeCompare(
          b.created_by_user?.name || "",
        ),
      render: (_val, row) => row.created_by_user?.name || "—",
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      cellClassName: "text-surface-300",
      render: (_val, row) => fmtDate(row.created_at),
    },
  ];

  const billFooter = (
    <tr className="font-bold">
      <td className="px-4 py-3 text-surface-400 text-xs uppercase tracking-wide" colSpan={3}>
        Totals — {filtered.length} bill{filtered.length !== 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {fmt(filtered.reduce((s, b) => s + computeBillTotal(b), 0))}
      </td>
      <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
        {fmt(filtered.reduce((s, b) => s + computePaidAmount(b), 0))}
      </td>
      <td className="px-4 py-3 text-right text-amber-400 tabular-nums">
        {fmt(filtered.reduce((s, b) => s + computeOutstanding(b), 0))}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell" />
      <td className="px-4 py-3" />
    </tr>
  );

  const productColumns = [
    {
      key: "_index",
      label: "#",
      headerClassName: "w-8",
      cellClassName: "text-surface-500 tabular-nums",
      render: (_val, _row, idx) => idx + 1,
    },
    {
      key: "name",
      label: "Product",
      sortable: true,
      cellClassName: "text-white font-medium",
    },
    {
      key: "quantity",
      label: "Qty Sold",
      align: "right",
      sortable: true,
      cellClassName: "text-surface-300 tabular-nums",
      render: (val) => val.toLocaleString(),
    },
    {
      key: "avgUnitPrice",
      label: "Unit Sale Price",
      align: "right",
      sortable: true,
      cellClassName: "text-surface-300 tabular-nums",
      render: (val) => fmt(val),
    },
    {
      key: "avgUnitCost",
      label: "Unit Avg Cost",
      align: "right",
      sortable: true,
      cellClassName: "text-surface-300 tabular-nums",
      render: (val) => fmt(val),
    },
    {
      key: "gpPerUnit",
      label: "GP / Unit",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (val) => (
        <span className={val >= 0 ? "text-emerald-400" : "text-red-400"}>
          {fmt(val)}
        </span>
      ),
    },
    {
      key: "contributionMargin",
      label: "Margin %",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (val) => (
        <span className={val >= 0 ? "text-primary-400" : "text-red-400"}>
          {val.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "value",
      label: "Total Sales",
      align: "right",
      sortable: true,
      cellClassName: "text-white font-medium tabular-nums",
      render: (val) => fmt(val),
    },
    {
      key: "totalGP",
      label: "Total GP",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      render: (val) => (
        <span className={val >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
          {fmt(val)}
        </span>
      ),
    },
  ];

  const productFooter = (
    <tr className="font-bold bg-surface-900/60 border-t-2 border-surface-600">
      <td className="px-4 py-3 text-surface-400 text-xs uppercase tracking-wide" colSpan={2}>
        Totals
      </td>
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {filteredProducts.reduce((s, p) => s + p.quantity, 0).toLocaleString()}
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {fmt(filteredProducts.reduce((s, p) => s + p.value, 0))}
      </td>
      <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
        {fmt(filteredProducts.reduce((s, p) => s + p.totalGP, 0))}
      </td>
    </tr>
  );

  const renderBillExpandedRow = (bill) => {
    if (expandedBill !== bill.id) return null;
    const allItems =
      bill.rounds?.flatMap(
        (r) =>
          r.round_items?.map((item) => ({
            ...item,
            roundNumber: r.round_number,
          })) || [],
      ) || [];
    const payments = bill.payments || [];
    if (allItems.length === 0 && payments.length === 0) return null;
    return (
      <tr key={`${bill.id}-expanded`}>
        <td colSpan={billColumns.length} className="px-0 py-0">
          <div className="bg-surface-900/60 border-y border-surface-700/50 px-6 py-3 space-y-3">
            {allItems.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-surface-500 uppercase tracking-wider">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-right pb-2 font-medium">Qty</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/20">
                  {allItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-surface-300">{item.product?.name || "—"}</td>
                      <td className="py-1.5 text-right text-surface-400 tabular-nums">{item.quantity}</td>
                      <td className="py-1.5 text-right text-surface-400 tabular-nums">{fmt(item.price)}</td>
                      <td className="py-1.5 text-right text-white font-medium tabular-nums">{fmt(item.quantity * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {payments.length > 0 && (
              <div className="border-t border-surface-700/40 pt-2">
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1.5 font-medium">Payments</p>
                <div className="flex flex-wrap gap-2">
                  {payments.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs">
                      <span className="text-surface-400 capitalize">{p.payment_type}</span>
                      <span className="text-white font-medium tabular-nums">{fmt(p.amount)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Receipt size={22} className="text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sales</h1>
              <p className="text-sm text-surface-400">
                Bills &amp; revenue overview
              </p>
            </div>
          </div>
          {statusFilter !== "z-report" && (
            <div className="sm:ml-auto w-full sm:w-auto space-y-2 sm:space-y-0">
              {/* Mobile: scrollable preset pills */}
              <div className="sm:hidden overflow-x-auto -mx-1 px-1 scrollbar-hide">
                <div className="flex gap-1.5 min-w-max pb-0.5">
                  {[
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "this_week", label: "This Week" },
                    { key: "last_week", label: "Last Week" },
                    { key: "this_month", label: "This Month" },
                    { key: "last_month", label: "Last Month" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setQuickSelect(key);
                        const preset = getDatePreset(key);
                        if (preset) { setStartDate(preset[0]); setEndDate(preset[1]); }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        quickSelect === key
                          ? "bg-primary-600 text-white"
                          : "bg-surface-700 text-surface-300 hover:bg-surface-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile: From → To range row */}
              <div className="sm:hidden flex items-end gap-2">
                <div className="flex-1 space-y-1 min-w-0">
                  <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">From</label>
                  <input
                    type="date"
                    className={`${inputCls} w-full`}
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      setQuickSelect("");
                      if (endDate && newStart > endDate) setEndDate("");
                    }}
                  />
                </div>
                <span className="text-surface-500 pb-2 shrink-0">→</span>
                <div className="flex-1 space-y-1 min-w-0">
                  <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">To</label>
                  <input
                    type="date"
                    className={`${inputCls} w-full`}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setQuickSelect("");
                    }}
                  />
                </div>
              </div>

              {/* Desktop: Quick Select dropdown + From + To */}
              <div className="hidden sm:flex sm:items-end sm:gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                    Quick Select
                  </label>
                  <select
                    className={inputCls}
                    value={quickSelect}
                    onChange={(e) => {
                      const key = e.target.value;
                      setQuickSelect(key);
                      const preset = getDatePreset(key);
                      if (preset) { setStartDate(preset[0]); setEndDate(preset[1]); }
                    }}
                  >
                    <option value="" disabled>Choose…</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="last_week">Last Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">From</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      setQuickSelect("");
                      if (endDate && newStart > endDate) setEndDate("");
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">To</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setQuickSelect("");
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      {statusFilter === "z-report" ? null : (
        <>
          {/* Mobile: compact 2-row summary */}
          <div className="sm:hidden space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Revenue</span>
                </div>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">KES {fmt(stats.revenue)}</p>
              </div>
              <div className="bg-surface-800/30 border border-amber-500/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt size={14} className="text-amber-400" />
                  <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Outstanding</span>
                </div>
                <p className="text-lg font-bold text-amber-400 tabular-nums">KES {fmt(stats.outstandingAmount)}</p>
                <p className="text-[10px] text-surface-500">{stats.outstandingCount} unpaid</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">Bills</p>
                <p className="text-lg font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">Closed</p>
                <p className="text-lg font-bold text-blue-400">{stats.completionRate}%</p>
              </div>
              <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">Void</p>
                <p className="text-lg font-bold text-red-400">{stats.voidRate}%</p>
              </div>
            </div>
          </div>

          {/* Desktop: 5-column strip */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-primary-400" />
                <span className="text-xs font-medium text-surface-400 uppercase">
                  Total Bills
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-xs font-medium text-surface-400 uppercase">
                  Revenue
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                KES {fmt(stats.revenue)}
              </p>
            </div>
            <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <PercentCircle size={16} className="text-blue-400" />
                <span className="text-xs font-medium text-surface-400 uppercase">
                  Completion Rate
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {stats.completionRate}%
              </p>
            </div>
            <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-400" />
                <span className="text-xs font-medium text-surface-400 uppercase">
                  Void Rate
                </span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stats.voidRate}%</p>
            </div>
            <div className="bg-surface-800/30 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={16} className="text-amber-400" />
                <span className="text-xs font-medium text-surface-400 uppercase">
                  Outstanding
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                KES {fmt(stats.outstandingAmount)}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {stats.outstandingCount} bill
                {stats.outstandingCount !== 1 ? "s" : ""} unpaid
              </p>
            </div>
          </div>
        </>
      )}

      {/* Bills Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="p-3 sm:p-4 border-b border-surface-700 space-y-3">
          {/* Status tabs — desktop only; mobile uses contextual bottom nav */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleStatusChange(tab.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.key
                      ? "bg-primary-600/20 text-primary-400"
                      : "text-surface-400 hover:text-white hover:bg-surface-700/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {statusFilter !== "z-report" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
                />
                <input
                  type="text"
                  placeholder={statusFilter === "products" ? "Search product..." : "Search customer..."}
                  className="w-full sm:w-48 pl-8 pr-8 sm:pr-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={statusFilter === "products" ? productSearch : search}
                  onChange={(e) =>
                    statusFilter === "products"
                      ? setProductSearch(e.target.value)
                      : setSearch(e.target.value)
                  }
                />
                {(statusFilter === "products" ? productSearch : search) && (
                  <button
                    onClick={() =>
                      statusFilter === "products" ? setProductSearch("") : setSearch("")
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                {statusFilter === "products" ? (
                  <>
                    <button
                      onClick={exportProductsToExcel}
                      disabled={productSales.items.length === 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Download size={14} />
                      Excel
                    </button>
                    <button
                      onClick={() => window.print()}
                      disabled={productSales.items.length === 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-700 text-surface-300 hover:bg-surface-600 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Printer size={14} />
                      PDF
                    </button>
                  </>
                ) : (
                  <button
                    onClick={exportToExcel}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Export
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {statusFilter === "z-report" ? (
          <div className="p-4">
            <ZReportTab />
          </div>
        ) : statusFilter === "products" ? (
          isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-surface-400" size={28} />
            </div>
          ) : productSales.items.length === 0 ? (
            <div className="py-16 text-center text-surface-500">
              <Package size={36} className="mx-auto mb-3 text-surface-700" />
              <p>No product sales for this period</p>
            </div>
          ) : (
            <>
              {/* Desktop product table */}
              <div className="hidden md:block">
                <PaginatedTable
                  columns={productColumns}
                  data={filteredProducts}
                  rowKey="name"
                  defaultSort={{ key: "value", dir: "desc" }}
                  defaultPageSize={25}
                  emptyMessage="No products match your search"
                  footer={productFooter}
                />
              </div>

              {/* Mobile product cards */}
              <MobileCardList>
                {/* Totals bar */}
                <div className="bg-surface-900/60 border border-surface-600 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Total Sales</p>
                    <p className="text-base font-bold text-emerald-400 tabular-nums">{fmt(filteredProducts.reduce((s, p) => s + p.value, 0))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Total GP</p>
                    <p className="text-base font-bold text-emerald-400 tabular-nums">{fmt(filteredProducts.reduce((s, p) => s + p.totalGP, 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Products</p>
                    <p className="text-base font-bold text-white">{filteredProducts.length}</p>
                  </div>
                </div>
                {filteredProducts.map((p, idx) => (
                  <MobileCard key={p.name}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-surface-500 tabular-nums shrink-0 w-5 text-right">
                          {idx + 1}.
                        </span>
                        <span className="text-sm font-medium text-white truncate">{p.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white tabular-nums shrink-0">
                        {fmt(p.value)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1.5 text-xs">
                      <div>
                        <p className="text-surface-500">Qty</p>
                        <p className="text-surface-300 tabular-nums">{p.quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-surface-500">GP/Unit</p>
                        <p className={`tabular-nums ${p.gpPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(p.gpPerUnit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-surface-500">Margin</p>
                        <p className={`tabular-nums font-medium ${p.contributionMargin >= 0 ? "text-primary-400" : "text-red-400"}`}>{p.contributionMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs">
                      <span className="text-surface-500">Total GP</span>
                      <span className={`tabular-nums font-medium ${p.totalGP >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(p.totalGP)}</span>
                    </div>
                  </MobileCard>
                ))}
              </MobileCardList>
            </>
          )
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-surface-400" size={28} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-surface-500">
                <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
                <p>No bills found for this period</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <PaginatedTable
                    columns={billColumns}
                    data={filtered}
                    rowKey="id"
                    defaultSort={{ key: "created_at", dir: "desc" }}
                    defaultPageSize={10}
                    onRowClick={(row) =>
                      setExpandedBill(
                        expandedBill === row.id ? null : row.id,
                      )
                    }
                    expandedRow={renderBillExpandedRow}
                    emptyMessage="No bills found for this period"
                    footer={billFooter}
                  />
                </div>

                {/* Mobile cards */}
                <MobileCardList>
                  {filtered.map((bill) => {
                    const isExpanded = expandedBill === bill.id;
                    const allItems =
                      bill.rounds?.flatMap(
                        (r) =>
                          r.round_items?.map((item) => ({
                            ...item,
                            roundNumber: r.round_number,
                          })) || [],
                      ) || [];
                    const billTotal = computeBillTotal(bill);

                    return (
                      <MobileCard
                        key={bill.id}
                        onClick={() =>
                          setExpandedBill(isExpanded ? null : bill.id)
                        }
                      >
                        {/* Row 1: Customer + Status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ChevronRight
                              size={12}
                              className={`text-surface-500 shrink-0 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                            />
                            <span className="text-white font-medium text-sm truncate">
                              {bill.customer_name || "Walk-in"}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_BADGE[bill.status] || "bg-surface-600/30 text-surface-400"}`}
                          >
                            {STATUS_LABEL[bill.status] || bill.status}
                          </span>
                        </div>

                        {/* Row 2: Amount + Item count */}
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-bold text-white tabular-nums">
                            KES {fmt(billTotal)}
                          </span>
                          <span className="text-xs text-surface-400">
                            {computeItemCount(bill)} item{computeItemCount(bill) !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Row 3: Meta info */}
                        <div className="flex items-center justify-between text-[11px] text-surface-500">
                          <span>{bill.created_by_user?.name || "—"}</span>
                          <span>{fmtDate(bill.created_at)}</span>
                        </div>

                        {/* Expanded: line items + payments */}
                        {isExpanded && (allItems.length > 0 || (bill.payments || []).length > 0) && (
                          <div className="mt-2 pt-2 border-t border-surface-700/50 space-y-2">
                            {allItems.length > 0 && (
                              <>
                                <div className="space-y-1.5">
                                  {allItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                      <span className="text-surface-300 truncate mr-3">{item.product?.name || "—"}</span>
                                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                                        <span className="text-surface-500">{item.quantity} × {fmt(item.price)}</span>
                                        <span className="text-white font-medium w-16 text-right">{fmt(item.quantity * item.price)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1 border-t border-surface-700/30 flex items-center justify-between text-xs">
                                  <span className="text-surface-400 font-medium">Total</span>
                                  <span className="text-white font-bold tabular-nums">{fmt(billTotal)}</span>
                                </div>
                              </>
                            )}
                            {(bill.payments || []).length > 0 && (
                              <div className="pt-1 border-t border-surface-700/30">
                                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Payments</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {bill.payments.map((p) => (
                                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-800 border border-surface-700 text-xs">
                                      <span className="text-surface-400 capitalize">{p.payment_type}</span>
                                      <span className="text-white font-medium tabular-nums">{fmt(p.amount)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </MobileCard>
                    );
                  })}
                </MobileCardList>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesPage;

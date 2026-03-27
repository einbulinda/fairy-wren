import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useBills } from "@/hooks/useBills";
import * as XLSX from "xlsx";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import PaginatedTable from "@/components/shared/PaginatedTable";
import { fmtNumber as fmt, fmtDate } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";
import ZReportTab from "@/components/reports/ZReportTab";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultStartDate = yesterday.toISOString().split("T")[0];
const defaultEndDate = defaultStartDate;

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Closed" },
  { key: "void", label: "Void" },
  { key: "products", label: "Product Sales" },
  { key: "z-report", label: "Z-Report" },
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
        (rSum, item) => rSum + item.quantity * item.price,
        0,
      ) || 0),
    0,
  ) || 0;

const computeItemCount = (bill) =>
  bill.rounds?.reduce(
    (sum, round) => sum + (round.round_items?.length || 0),
    0,
  ) || 0;

const SalesPage = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [quickSelect, setQuickSelect] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
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
  const bills = data?.bills ?? [];

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
          const name = item.product?.name || "Unknown";
          if (!map[name]) map[name] = { name, quantity: 0, value: 0 };
          map[name].quantity += item.quantity;
          map[name].value += item.quantity * item.price;
        }
      }
    }
    const list = Object.values(map).sort((a, b) => b.value - a.value);
    const grandTotal = list.reduce((s, p) => s + p.value, 0);
    return {
      items: list,
      grandTotal,
      grandQty: list.reduce((s, p) => s + p.quantity, 0),
    };
  }, [bills]);

  const handleStatusChange = (key) => {
    setStatusFilter(key);
  };

  // Excel export
  const exportToExcel = () => {
    const rows = filtered.map((bill) => ({
      Customer: bill.customer_name || "Walk-in",
      Status: STATUS_LABEL[bill.status] || bill.status,
      Items: computeItemCount(bill),
      "Total (KES)": computeBillTotal(bill),
      "Created By": bill.created_by_user?.name || "—",
      Date: fmtDate(bill.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, `bills-${startDate}-to-${endDate}.xlsx`);
  };

  const exportProductsToExcel = () => {
    const rows = productSales.items.map((p, idx) => ({
      "#": idx + 1,
      Product: p.name,
      "Qty Sold": p.quantity,
      "Sales Value (KES)": p.value,
      "Contribution %":
        productSales.grandTotal > 0
          ? ((p.value / productSales.grandTotal) * 100).toFixed(2) + "%"
          : "0.00%",
    }));
    rows.push({
      "#": "",
      Product: "Total",
      "Qty Sold": productSales.grandQty,
      "Sales Value (KES)": productSales.grandTotal,
      "Contribution %": "100.00%",
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 12 },
      { wch: 18 },
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
      label: "Total (KES)",
      align: "right",
      sortable: true,
      cellClassName: "text-white font-medium tabular-nums",
      sortFn: (a, b) => computeBillTotal(a) - computeBillTotal(b),
      render: (_val, row) => fmt(computeBillTotal(row)),
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
      key: "value",
      label: "Sales Value (KES)",
      align: "right",
      sortable: true,
      cellClassName: "text-white font-medium tabular-nums",
      render: (val) => fmt(val),
    },
    {
      key: "contribution",
      label: "Contribution %",
      align: "right",
      sortable: true,
      cellClassName: "text-primary-400 tabular-nums",
      sortFn: (a, b) =>
        productSales.grandTotal > 0
          ? a.value / productSales.grandTotal -
            b.value / productSales.grandTotal
          : 0,
      render: (_val, row) =>
        `${productSales.grandTotal > 0 ? ((row.value / productSales.grandTotal) * 100).toFixed(2) : "0.00"}%`,
    },
  ];

  const productFooter = (
    <tr className="font-bold">
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-white">Total</td>
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {productSales.grandQty.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
        {fmt(productSales.grandTotal)}
      </td>
      <td className="px-4 py-3 text-right text-primary-400 tabular-nums">
        100.00%
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
    if (allItems.length === 0) return null;
    return (
      <tr key={`${bill.id}-expanded`}>
        <td colSpan={billColumns.length} className="px-0 py-0">
          <div className="bg-surface-900/60 border-y border-surface-700/50 px-6 py-3">
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
                    <td className="py-1.5 text-surface-300">
                      {item.product?.name || "—"}
                    </td>
                    <td className="py-1.5 text-right text-surface-400 tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right text-surface-400 tabular-nums">
                      {fmt(item.price)}
                    </td>
                    <td className="py-1.5 text-right text-white font-medium tabular-nums">
                      {fmt(item.quantity * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
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
            <div className="flex items-center gap-3 sm:ml-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider mr-2">
                  Quick Select
                </label>
                <select
                  className={inputCls}
                  value={quickSelect}
                  onChange={(e) => {
                    const key = e.target.value;
                    setQuickSelect(key);
                    const preset = getDatePreset(key);
                    if (preset) {
                      setStartDate(preset[0]);
                      setEndDate(preset[1]);
                    }
                  }}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="last_week">Last Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                  From
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuickSelect("");
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                  To
                </label>
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
          )}
        </div>
      </div>

      {/* Summary Strip */}
      {statusFilter === "z-report" ? null : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
      )}

      {/* Bills Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-surface-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? "bg-primary-600/20 text-primary-400"
                    : "text-surface-400 hover:text-white hover:bg-surface-700/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {statusFilter !== "z-report" && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
                />
                <input
                  type="text"
                  placeholder="Search customer..."
                  className="pl-8 pr-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {statusFilter === "products" ? (
                <>
                  <button
                    onClick={exportProductsToExcel}
                    disabled={productSales.items.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={productSales.items.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 text-surface-300 hover:bg-surface-600 disabled:opacity-40 text-sm font-medium rounded-lg transition-colors"
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
            <PaginatedTable
              columns={productColumns}
              data={productSales.items}
              rowKey="name"
              defaultSort={{ key: "value", dir: "desc" }}
              defaultPageSize={10}
              emptyMessage="No product sales for this period"
              footer={productFooter}
            />
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

                    return (
                      <MobileCard
                        key={bill.id}
                        onClick={() =>
                          setExpandedBill(isExpanded ? null : bill.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-sm">
                            {bill.customer_name || "Walk-in"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[bill.status] || "bg-surface-600/30 text-surface-400"}`}
                          >
                            {STATUS_LABEL[bill.status] || bill.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-semibold tabular-nums">
                            KES {fmt(computeBillTotal(bill))}
                          </span>
                          <span className="text-surface-400 text-xs">
                            {computeItemCount(bill)} items
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-surface-400">
                          <span>{bill.created_by_user?.name || "—"}</span>
                          <span>{fmtDate(bill.created_at)}</span>
                        </div>
                        {isExpanded && allItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-surface-700/50 space-y-1.5">
                            {allItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-surface-300 truncate mr-2">
                                  {item.product?.name || "—"}
                                </span>
                                <span className="text-surface-400 tabular-nums shrink-0">
                                  {item.quantity} × {fmt(item.price)} ={" "}
                                  <span className="text-white font-medium">
                                    {fmt(item.quantity * item.price)}
                                  </span>
                                </span>
                              </div>
                            ))}
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

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import { fmtNumber as fmt, fmtDate } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";
import ZReportTab from "@/components/reports/ZReportTab";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultStartDate = yesterday.toISOString().split("T")[0];
const defaultEndDate = defaultStartDate;

const PAGE_SIZE = 10;

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedBill, setExpandedBill] = useState(null);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [pSortKey, setPSortKey] = useState("value");
  const [pSortDir, setPSortDir] = useState("desc");
  const [pPage, setPPage] = useState(1);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const togglePSort = (key) => {
    if (pSortKey === key) {
      setPSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setPSortKey(key);
      setPSortDir("asc");
    }
    setPPage(1);
  };

  const params = useMemo(() => {
    const p = { startDate, endDate };
    if (statusFilter !== "all" && statusFilter !== "products" && statusFilter !== "z-report") p.status = statusFilter;
    return p;
  }, [startDate, endDate, statusFilter]);

  const { data: bills = [], isLoading } = useBills(params);

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

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "status":
          av = a.status || "";
          bv = b.status || "";
          return av.localeCompare(bv) * dir;
        case "total":
          av = computeBillTotal(a);
          bv = computeBillTotal(b);
          return (av - bv) * dir;
        case "created_by":
          av = a.created_by_user?.name || "";
          bv = b.created_by_user?.name || "";
          return av.localeCompare(bv) * dir;
        case "created_at":
          av = a.created_at || "";
          bv = b.created_at || "";
          return av.localeCompare(bv) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  // Summary stats from full list
  const stats = useMemo(() => {
    const total = bills.length;
    const revenue = bills.reduce((s, b) => s + computeBillTotal(b), 0);
    const completed = bills.filter((b) => b.status === "completed").length;
    // Only count voided bills that had items added
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

  // Product sales summary (aggregated from all bills in period)
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
    return { items: list, grandTotal, grandQty: list.reduce((s, p) => s + p.quantity, 0) };
  }, [bills]);

  // Sort product sales
  const sortedProducts = useMemo(() => {
    const list = [...productSales.items];
    const dir = pSortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (pSortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "quantity":
          return (a.quantity - b.quantity) * dir;
        case "value":
          return (a.value - b.value) * dir;
        case "contribution": {
          const ac = productSales.grandTotal > 0 ? a.value / productSales.grandTotal : 0;
          const bc = productSales.grandTotal > 0 ? b.value / productSales.grandTotal : 0;
          return (ac - bc) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [productSales, pSortKey, pSortDir]);

  // Product sales pagination
  const pTotalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const pSafePage = Math.min(pPage, pTotalPages);
  const pPageItems = sortedProducts.slice(
    (pSafePage - 1) * PAGE_SIZE,
    pSafePage * PAGE_SIZE,
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Reset page on filter change
  const handleStatusChange = (key) => {
    setStatusFilter(key);
    setPage(1);
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

  // Product sales Excel export
  const exportProductsToExcel = () => {
    const rows = sortedProducts.map((p, idx) => ({
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
    ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product Sales");
    XLSX.writeFile(wb, `product-sales-${startDate}-to-${endDate}.xlsx`);
  };

  const inputCls = dateInputCls;

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
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                  From
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
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
                    setPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      {statusFilter === "z-report" ? null : <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            {stats.outstandingCount} bill{stats.outstandingCount !== 1 ? "s" : ""} unpaid
          </p>
        </div>
      </div>}

      {/* Bills Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-surface-700 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status tabs */}
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

          {statusFilter !== "z-report" && <div className="flex items-center gap-2 sm:ml-auto">
            {/* Search */}
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Export */}
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
          </div>}
        </div>

        {/* Content */}
        {statusFilter === "z-report" ? (
          <div className="p-4">
            <ZReportTab />
          </div>
        ) : statusFilter === "products" ? (
          /* Product Sales Summary Table */
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider w-8">
                      #
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => togglePSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Product
                        {pSortKey === "name" ? (pSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => togglePSort("quantity")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Qty Sold
                        {pSortKey === "quantity" ? (pSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => togglePSort("value")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Sales Value (KES)
                        {pSortKey === "value" ? (pSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => togglePSort("contribution")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Contribution %
                        {pSortKey === "contribution" ? (pSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {pPageItems.map((product, idx) => (
                    <tr key={product.name} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-4 py-2.5 text-surface-500 tabular-nums">
                        {(pSafePage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-2.5 text-white font-medium">
                        {product.name}
                      </td>
                      <td className="px-4 py-2.5 text-right text-surface-300 tabular-nums">
                        {product.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white font-medium tabular-nums">
                        {fmt(product.value)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-primary-400 tabular-nums">
                        {productSales.grandTotal > 0
                          ? ((product.value / productSales.grandTotal) * 100).toFixed(2)
                          : "0.00"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-surface-600 bg-surface-900/70">
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
                </tfoot>
              </table>
            </div>

            {/* Product sales pagination */}
            {pTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  {sortedProducts.length} product{sortedProducts.length !== 1 ? "s" : ""} · Page{" "}
                  {pSafePage} of {pTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPPage((p) => Math.max(1, p - 1))}
                    disabled={pSafePage === 1}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPPage((p) => Math.min(pTotalPages, p + 1))}
                    disabled={pSafePage === pTotalPages}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
            </>
          )
        ) : (
          /* Bills Table */
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                    onClick={() => toggleSort("status")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortKey === "status" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th
                    className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                    onClick={() => toggleSort("total")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Total (KES)
                      {sortKey === "total" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                    </span>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:text-white transition-colors"
                    onClick={() => toggleSort("created_by")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Created By
                      {sortKey === "created_by" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                    </span>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
                    onClick={() => toggleSort("created_at")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date
                      {sortKey === "created_at" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {pageItems.map((bill) => {
                  const isExpanded = expandedBill === bill.id;
                  const allItems = bill.rounds?.flatMap(
                    (r) =>
                      r.round_items?.map((item) => ({
                        ...item,
                        roundNumber: r.round_number,
                      })) || [],
                  ) || [];

                  return (
                    <React.Fragment key={bill.id}>
                      <tr
                        className="hover:bg-surface-700/20 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedBill(isExpanded ? null : bill.id)
                        }
                      >
                        <td className="px-4 py-2.5 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                            >
                              <ChevronRight size={14} className="text-surface-500" />
                            </span>
                            {bill.customer_name || "Walk-in"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[bill.status] || "bg-surface-600/30 text-surface-400"}`}
                          >
                            {STATUS_LABEL[bill.status] || bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-surface-300">
                          {computeItemCount(bill)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-white font-medium tabular-nums">
                          {fmt(computeBillTotal(bill))}
                        </td>
                        <td className="px-4 py-2.5 text-surface-300 hidden lg:table-cell">
                          {bill.created_by_user?.name || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-surface-300">
                          {fmtDate(bill.created_at)}
                        </td>
                      </tr>
                      {isExpanded && allItems.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <div className="bg-surface-900/60 border-y border-surface-700/50 px-6 py-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-surface-500 uppercase tracking-wider">
                                    <th className="text-left pb-2 font-medium">
                                      Product
                                    </th>
                                    <th className="text-right pb-2 font-medium">
                                      Qty
                                    </th>
                                    <th className="text-right pb-2 font-medium">
                                      Price
                                    </th>
                                    <th className="text-right pb-2 font-medium">
                                      Subtotal
                                    </th>
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
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <MobileCardList>
            {pageItems.map((bill) => {
              const isExpanded = expandedBill === bill.id;
              const allItems = bill.rounds?.flatMap(
                (r) =>
                  r.round_items?.map((item) => ({
                    ...item,
                    roundNumber: r.round_number,
                  })) || [],
              ) || [];

              return (
                <MobileCard
                  key={bill.id}
                  onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
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
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-surface-300 truncate mr-2">
                            {item.product?.name || "—"}
                          </span>
                          <span className="text-surface-400 tabular-nums shrink-0">
                            {item.quantity} × {fmt(item.price)} = <span className="text-white font-medium">{fmt(item.quantity * item.price)}</span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <span className="text-sm text-surface-400">
              {filtered.length} bill{filtered.length !== 1 ? "s" : ""} · Page{" "}
              {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={18} />
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

export default SalesPage;

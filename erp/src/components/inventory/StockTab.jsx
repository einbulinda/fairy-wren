import { useState, useMemo, useEffect } from "react";
import {
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { inputCls, PAGE_SIZE } from "./inventoryUtils";

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return <ChevronUp size={12} className="text-surface-600 opacity-50" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-primary-400" />
  ) : (
    <ChevronDown size={12} className="text-primary-400" />
  );
};

const StockTab = ({ items, isLoading, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name?.toLowerCase().includes(q));
  }, [items, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortCol === "name") {
        av = (a.name || "").toLowerCase();
        bv = (b.name || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === "stock") {
        av = a.current_stock ?? 0;
        bv = b.current_stock ?? 0;
      } else if (sortCol === "cost") {
        av = a.cost_price ?? 0;
        bv = b.cost_price ?? 0;
      } else if (sortCol === "value") {
        av = (a.cost_price ?? 0) * (a.current_stock ?? 0);
        bv = (b.cost_price ?? 0) * (b.current_stock ?? 0);
      } else if (sortCol === "status") {
        const rank = (item) => {
          const stock = item.current_stock ?? 0;
          if (stock <= 0) return 0;
          if (stock <= (item.reorder_level || 0)) return 1;
          return 2;
        };
        av = rank(a);
        bv = rank(b);
      } else {
        return 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortCol, sortDir]);

  useEffect(() => setPage(1), [search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const low = items?.filter(
    (i) => i.current_stock > 0 && i.reorder_level > 0 && i.current_stock <= i.reorder_level,
  ).length;
  const out = items?.filter((i) => i.current_stock <= 0).length;

  const thCls =
    "px-4 py-3 text-left cursor-pointer select-none hover:text-white transition-colors";

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total SKUs", value: items.length, color: "primary" },
          { label: "Low Stock", value: low, color: "yellow" },
          { label: "Out of Stock", value: out, color: "red" },
          {
            label: "Total Value",
            value: `KSh ${items.reduce((s, i) => s + (i.cost_price || 0) * i.current_stock, 0).toLocaleString()}`,
            color: "green",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-800 rounded-xl p-4 border border-surface-700"
          >
            <p className="text-surface-400 text-xs mb-1">{stat.label}</p>
            <p className={`text-xl font-bold text-${stat.color}-400`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Alert */}
      {(low > 0 || out > 0) && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {out > 0 && <strong>{out} items out of stock. </strong>}
            {low > 0 && <span>{low} items running low.</span>}
          </span>
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
          />
          <input
            className={inputCls + " pl-9"}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-2 bg-surface-700 rounded-lg hover:bg-surface-600 text-surface-300 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th
                className={thCls}
                onClick={() => handleSort("name")}
              >
                <span className="flex items-center gap-1">
                  Product <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
              <th
                className={thCls + " text-right"}
                onClick={() => handleSort("stock")}
              >
                <span className="flex items-center justify-end gap-1">
                  Stock <SortIcon col="stock" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
              <th
                className={thCls + " text-right"}
                onClick={() => handleSort("cost")}
              >
                <span className="flex items-center justify-end gap-1">
                  Cost Price <SortIcon col="cost" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
              <th
                className={thCls + " text-right"}
                onClick={() => handleSort("value")}
              >
                <span className="flex items-center justify-end gap-1">
                  Value <SortIcon col="value" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
              <th className={thCls + " text-right"}>
                <span className="flex items-center justify-end gap-1">ROL</span>
              </th>
              <th
                className={thCls + " text-center"}
                onClick={() => handleSort("status")}
              >
                <span className="flex items-center justify-center gap-1">
                  Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-400">
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-400">
                  No items found
                </td>
              </tr>
            ) : (
              paginated.map((item) => {
                const reorderLevel = item.reorder_level || 0;
                const stockStatus =
                  item.current_stock <= 0
                    ? "out"
                    : item.current_stock <= reorderLevel
                      ? "low"
                      : "ok";
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-surface-400 text-xs">
                        {item.category_name || item.categories?.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                      {item.current_stock}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-surface-300">
                      KSh {(item.cost_price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-surface-300">
                      KSh{" "}
                      {(
                        (item.cost_price || 0) * item.current_stock
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-surface-400">
                      {item.reorder_level > 0 ? item.reorder_level : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          stockStatus === "out"
                            ? "bg-red-500/20 text-red-400"
                            : stockStatus === "low"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {stockStatus === "out"
                          ? "Out of Stock"
                          : stockStatus === "low"
                            ? "Low"
                            : "In Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-xs text-surface-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-surface-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTab;

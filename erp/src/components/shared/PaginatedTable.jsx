import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

/**
 * Reusable paginated, sortable table component.
 *
 * @param {Object} props
 * @param {Array<{
 *   key: string,
 *   label: string,
 *   sortable?: boolean,
 *   align?: "left"|"right"|"center",
 *   headerClassName?: string,
 *   cellClassName?: string,
 *   sortFn?: (a: any, b: any) => number,
 *   render?: (value: any, row: any, index: number) => React.ReactNode,
 * }>} props.columns
 * @param {Array<Object>} props.data
 * @param {string} [props.rowKey="id"] - Key to use for row identity
 * @param {{ key: string, dir: "asc"|"desc" }} [props.defaultSort]
 * @param {number} [props.defaultPageSize=10]
 * @param {(row: Object) => React.ReactNode} [props.expandedRow] - Render expanded content for a row
 * @param {(row: Object) => void} [props.onRowClick]
 * @param {string} [props.emptyMessage="No data found"]
 * @param {React.ReactNode} [props.footer] - Optional tfoot content
 */
const PaginatedTable = ({
  columns,
  data,
  rowKey = "id",
  defaultSort,
  defaultPageSize = 10,
  expandedRow,
  onRowClick,
  emptyMessage = "No data found",
  footer,
}) => {
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir ?? "asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return data;

    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...data];
    list.sort((a, b) => {
      if (col.sortFn) return col.sortFn(a, b) * dir;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [data, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + pageSize);

  const alignCls = (align) =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  const SortIcon = ({ colKey }) => {
    if (sortKey === colKey) {
      return sortDir === "asc" ? (
        <ArrowUp size={12} />
      ) : (
        <ArrowDown size={12} />
      );
    }
    return <ArrowUpDown size={12} className="opacity-40" />;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-900/50 border-b border-surface-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider ${alignCls(col.align)} ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-white transition-colors"
                      : ""
                  } ${col.headerClassName ?? ""}`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.sortable ? (
                    <span
                      className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/30">
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-surface-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageItems.map((row, idx) => {
                const globalIdx = startIdx + idx;
                const key = row[rowKey] ?? globalIdx;
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={`hover:bg-surface-700/20 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${alignCls(col.align)} ${col.cellClassName ?? ""}`}
                        >
                          {col.render
                            ? col.render(row[col.key], row, globalIdx)
                            : (row[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                    {expandedRow?.(row)}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {footer && <tfoot className="border-t-2 border-surface-600 bg-surface-900/70">{footer}</tfoot>}
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400">
            Showing {sorted.length === 0 ? 0 : startIdx + 1}–
            {Math.min(startIdx + pageSize, sorted.length)} of {sorted.length}
          </span>
          <select
            className="bg-surface-900 border border-surface-600 rounded-lg text-surface-300 text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-surface-400 px-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PaginatedTable;

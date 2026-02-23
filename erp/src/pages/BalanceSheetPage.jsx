import { useState, useMemo } from "react";
import { useBalanceSheet } from "@/hooks/useBalanceSheet";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const todayStr = new Date().toISOString().split("T")[0];

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

  // Roll up children balances into parents
  const rollUp = (node) => {
    if (node.children.length > 0) {
      node.children.forEach(rollUp);
      const childSum = node.children.reduce((s, c) => s + Number(c.balance), 0);
      // If parent has its own transactions, keep it; otherwise use children sum
      if (Number(node.balance) === 0) {
        node.balance = childSum;
      }
    }
  };
  roots.forEach(rollUp);

  return roots;
};

const AccountRow = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const balance = Number(node.balance);

  return (
    <>
      <tr
        className={`hover:bg-surface-700/30 transition-colors ${
          hasChildren ? "font-medium" : ""
        }`}
      >
        <td className="px-4 py-2.5 text-surface-300">
          <div
            className="flex items-center gap-1.5"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="p-0.5 rounded hover:bg-surface-600 text-surface-400"
              >
                {expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="text-surface-500 font-mono text-xs mr-2">
              {node.account_code}
            </span>
            <span className={hasChildren ? "text-white" : ""}>
              {node.account_name}
            </span>
          </div>
        </td>
        <td
          className={`px-4 py-2.5 text-right tabular-nums ${
            hasChildren ? "text-white font-semibold" : "text-surface-300"
          }`}
        >
          {fmt(balance)}
        </td>
      </tr>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <AccountRow key={child.account_id} node={child} depth={depth + 1} />
        ))}
    </>
  );
};

const SectionTable = ({ title, icon: Icon, iconColor, accounts, totalLabel, total }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full p-4 border-b border-surface-700 flex items-center justify-between hover:bg-surface-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{fmt(total)}</span>
          {collapsed ? (
            <ChevronRight size={16} className="text-surface-400" />
          ) : (
            <ChevronDown size={16} className="text-surface-400" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-900/50 border-b border-surface-700">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {accounts.map((node) => (
                <AccountRow key={node.account_id} node={node} />
              ))}
            </tbody>
            <tfoot className="border-t-2 border-surface-600">
              <tr className="bg-surface-900/30">
                <td className="px-4 py-3 font-bold text-white">{totalLabel}</td>
                <td className="px-4 py-3 text-right font-bold text-white text-base">
                  {fmt(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

const BalanceSheetPage = () => {
  const [asOfDate, setAsOfDate] = useState(todayStr);
  const { data, isLoading, isFetching } = useBalanceSheet(asOfDate);

  const { assetTree, liabilityTree, equityTree, totals } = useMemo(() => {
    if (!data?.accounts) {
      return { assetTree: [], liabilityTree: [], equityTree: [], totals: {} };
    }

    const assets = data.accounts.filter((a) => a.account_class === "asset");
    const liabilities = data.accounts.filter((a) => a.account_class === "liability");
    const equity = data.accounts.filter((a) => a.account_class === "equity");

    const assetTree = buildTree(assets);
    const liabilityTree = buildTree(liabilities);
    const equityTree = buildTree(equity);

    const totalAssets = assetTree.reduce((s, n) => s + Number(n.balance), 0);
    const totalLiabilities = liabilityTree.reduce((s, n) => s + Number(n.balance), 0);
    const netIncome = Number(data.netIncome ?? 0);
    const totalEquity =
      equityTree.reduce((s, n) => s + Number(n.balance), 0) + netIncome;

    return {
      assetTree,
      liabilityTree,
      equityTree,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        netIncome,
        liabilitiesPlusEquity: totalLiabilities + totalEquity,
      },
    };
  }, [data]);

  const isBalanced =
    totals.assets !== undefined &&
    Math.abs(totals.assets - totals.liabilitiesPlusEquity) < 0.01;

  const inputCls =
    "px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Balance Sheet</h1>
              <p className="text-xs text-surface-400">
                Statement of financial position
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                As of Date
              </label>
              <input
                type="date"
                className={inputCls}
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            {isFetching && (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin self-end mb-2" />
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-xs text-surface-400 uppercase tracking-wider">
                Total Assets
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {fmt(totals.assets)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={15} className="text-red-400" />
              <span className="text-xs text-surface-400 uppercase tracking-wider">
                Total Liabilities
              </span>
            </div>
            <p className="text-xl font-bold text-red-400">
              {fmt(totals.liabilities)}
            </p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale size={15} className="text-primary-400" />
              <span className="text-xs text-surface-400 uppercase tracking-wider">
                Total Equity
              </span>
            </div>
            <p className="text-xl font-bold text-primary-400">
              {fmt(totals.equity)}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="py-16 text-center text-surface-500">
          <FileText size={40} className="mx-auto mb-3 text-surface-700" />
          <p>Select a date to generate the balance sheet</p>
        </div>
      ) : (
        <>
          {/* Assets */}
          <SectionTable
            title="Assets"
            icon={TrendingUp}
            iconColor="text-emerald-400"
            accounts={assetTree}
            totalLabel="Total Assets"
            total={totals.assets}
          />

          {/* Liabilities */}
          <SectionTable
            title="Liabilities"
            icon={TrendingDown}
            iconColor="text-red-400"
            accounts={liabilityTree}
            totalLabel="Total Liabilities"
            total={totals.liabilities}
          />

          {/* Equity */}
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-primary-400" />
                <h3 className="font-semibold text-white">Equity</h3>
              </div>
              <span className="text-sm font-bold text-white">
                {fmt(totals.equity)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {equityTree.map((node) => (
                    <AccountRow key={node.account_id} node={node} />
                  ))}
                  {/* Retained Earnings (Net Income) row */}
                  <tr className="hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-surface-300">
                      <div className="flex items-center gap-1.5 pl-5">
                        <span className="w-5" />
                        <span className="italic text-amber-400">
                          Retained Earnings (Net Income)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-amber-400 italic">
                      {fmt(totals.netIncome)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-surface-600">
                  <tr className="bg-surface-900/30">
                    <td className="px-4 py-3 font-bold text-white">
                      Total Equity
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white text-base">
                      {fmt(totals.equity)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Accounting Equation Verification */}
          <div
            className={`border rounded-xl p-4 flex items-center justify-between ${
              isBalanced
                ? "bg-emerald-900/20 border-emerald-700/50"
                : "bg-amber-900/20 border-amber-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    isBalanced ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {isBalanced
                    ? "Balance Sheet is balanced"
                    : "Balance Sheet is out of balance"}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Assets ({fmt(totals.assets)}) ={" "}
                  Liabilities ({fmt(totals.liabilities)}) + Equity ({fmt(totals.equity)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400">Liabilities + Equity</p>
              <p
                className={`font-bold ${
                  isBalanced ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {fmt(totals.liabilitiesPlusEquity)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalanceSheetPage;

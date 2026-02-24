import { useMemo } from "react";
import { Link } from "react-router";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Scale,
} from "lucide-react";
import { useBalanceSheet } from "@/hooks/useBalanceSheet";

const todayStr = new Date().toISOString().split("T")[0];

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

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
      if (Number(node.balance) === 0) node.balance = childSum;
    }
  };
  roots.forEach(rollUp);
  return roots;
};

const reports = [
  {
    to: "/reports/balance-sheet",
    icon: FileText,
    iconColor: "text-primary-400",
    title: "Balance Sheet",
    description:
      "Statement of financial position — assets, liabilities, and equity as of a specific date.",
  },
  {
    to: "#",
    icon: TrendingUp,
    iconColor: "text-surface-600",
    title: "Income Statement",
    description: "Revenue, expenses, and net income over a period.",
    disabled: true,
  },
  {
    to: "#",
    icon: DollarSign,
    iconColor: "text-surface-600",
    title: "Cash Flow Statement",
    description:
      "Cash inflows and outflows from operations, investing, and financing.",
    disabled: true,
  },
  {
    to: "#",
    icon: BarChart3,
    iconColor: "text-surface-600",
    title: "Trial Balance",
    description:
      "Summary of all account balances to verify debits equal credits.",
    disabled: true,
  },
];

const FinancialReportsPage = () => {
  const { data, isLoading } = useBalanceSheet(todayStr);

  const totals = useMemo(() => {
    if (!data?.accounts) return null;

    const assets = data.accounts.filter((a) => a.account_class === "asset");
    const liabilities = data.accounts.filter((a) => a.account_class === "liability");
    const equity = data.accounts.filter((a) => a.account_class === "equity");

    const assetTree = buildTree(assets);
    const liabilityTree = buildTree(liabilities);
    const equityTree = buildTree(equity);

    const sum = (roots) => roots.reduce((s, n) => s + Number(n.balance), 0);
    const netIncome = Number(data.netIncome ?? 0);

    return {
      assets: sum(assetTree),
      liabilities: sum(liabilityTree),
      equity: sum(equityTree) + netIncome,
    };
  }, [data]);

  const summaryCards = [
    {
      label: "Total Assets",
      value: totals?.assets,
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
    },
    {
      label: "Total Liabilities",
      value: totals?.liabilities,
      icon: TrendingDown,
      iconColor: "text-red-400",
      valueColor: "text-red-400",
    },
    {
      label: "Total Equity",
      value: totals?.equity,
      icon: Scale,
      iconColor: "text-primary-400",
      valueColor: "text-primary-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Financial Reports</h1>
        <p className="text-sm text-surface-400 mt-1">
          Generate and view financial statements
        </p>
      </div>

      {/* Balance Sheet Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-surface-700 rounded w-24 mb-3" />
              <div className="h-7 bg-surface-700 rounded w-32" />
            </div>
          ))}
        </div>
      ) : totals ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <Link
              key={card.label}
              to="/reports/balance-sheet"
              className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 hover:bg-surface-700/50 hover:border-surface-600 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <card.icon size={15} className={card.iconColor} />
                <span className="text-xs text-surface-400 uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className={`text-xl font-bold ${card.valueColor}`}>
                {fmt(card.value)}
              </p>
              <p className="text-xs text-surface-500 mt-1 group-hover:text-surface-400 transition-colors">
                View balance sheet &rarr;
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Wrapper = report.disabled ? "div" : Link;
          const wrapperProps = report.disabled ? {} : { to: report.to };

          return (
            <Wrapper
              key={report.title}
              {...wrapperProps}
              className={`bg-surface-800/50 border border-surface-700 rounded-xl p-5 transition-colors ${
                report.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-surface-700/50 hover:border-surface-600"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    report.disabled ? "bg-surface-800" : "bg-primary-600/20"
                  }`}
                >
                  <report.icon size={20} className={report.iconColor} />
                </div>
                <h3 className="font-semibold text-white">{report.title}</h3>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                {report.description}
              </p>
              {report.disabled && (
                <span className="inline-block mt-3 text-xs text-surface-500 bg-surface-800 px-2 py-1 rounded">
                  Coming soon
                </span>
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};

export default FinancialReportsPage;

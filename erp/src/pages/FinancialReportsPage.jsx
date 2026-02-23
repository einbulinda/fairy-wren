import { Link } from "react-router";
import { FileText, TrendingUp, BarChart3, DollarSign } from "lucide-react";

const reports = [
  {
    to: "/reports/balance-sheet",
    icon: FileText,
    iconColor: "text-primary-400",
    title: "Balance Sheet",
    description: "Statement of financial position — assets, liabilities, and equity as of a specific date.",
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
    description: "Cash inflows and outflows from operations, investing, and financing.",
    disabled: true,
  },
  {
    to: "#",
    icon: BarChart3,
    iconColor: "text-surface-600",
    title: "Trial Balance",
    description: "Summary of all account balances to verify debits equal credits.",
    disabled: true,
  },
];

const FinancialReportsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Financial Reports</h1>
        <p className="text-sm text-surface-400 mt-1">
          Generate and view financial statements
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Wrapper = report.disabled ? "div" : Link;
          const wrapperProps = report.disabled
            ? {}
            : { to: report.to };

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

import { useSearchParams } from "react-router";
import { TrendingUp, FileText, BarChart3, DollarSign, Scale } from "lucide-react";
import IncomeStatementPage from "./IncomeStatementPage";
import BalanceSheetPage from "./BalanceSheetPage";
import TrialBalancePage from "./TrialBalancePage";
import CashFlowStatementPage from "./CashFlowStatementPage";
import EquityChangesPage from "./EquityChangesPage";

const TABS = [
  { key: "income-statement", label: "Income Statement", short: "Income", icon: TrendingUp, component: IncomeStatementPage },
  { key: "balance-sheet", label: "Balance Sheet", short: "Balance", icon: FileText, component: BalanceSheetPage },
  { key: "trial-balance", label: "Trial Balance", short: "Trial", icon: BarChart3, component: TrialBalancePage },
  { key: "cash-flow", label: "Cash Flow", short: "Cash", icon: DollarSign, component: CashFlowStatementPage },
  { key: "equity-changes", label: "Equity Changes", short: "Equity", icon: Scale, component: EquityChangesPage },
];

const FinancialReportsPage = ({ defaultTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || defaultTab || "income-statement";
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar — desktop only; mobile uses bottom nav */}
      <div className="hidden md:block border-b border-surface-700">
        <nav className="flex gap-0.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
};

export default FinancialReportsPage;

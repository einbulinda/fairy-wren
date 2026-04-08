import { useState } from "react";
import { TrendingUp, FileText, BarChart3, DollarSign, Scale } from "lucide-react";
import IncomeStatementPage from "./IncomeStatementPage";
import BalanceSheetPage from "./BalanceSheetPage";
import TrialBalancePage from "./TrialBalancePage";
import CashFlowStatementPage from "./CashFlowStatementPage";
import EquityChangesPage from "./EquityChangesPage";

const TABS = [
  { key: "income-statement", label: "Income Statement", icon: TrendingUp, component: IncomeStatementPage },
  { key: "balance-sheet", label: "Balance Sheet", icon: FileText, component: BalanceSheetPage },
  { key: "trial-balance", label: "Trial Balance", icon: BarChart3, component: TrialBalancePage },
  { key: "cash-flow", label: "Cash Flow", icon: DollarSign, component: CashFlowStatementPage },
  { key: "equity-changes", label: "Equity Changes", icon: Scale, component: EquityChangesPage },
];

const FinancialReportsPage = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || "income-statement");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
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

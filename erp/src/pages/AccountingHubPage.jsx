import { useState } from "react";
import { Landmark, BookOpen, PenLine, FileCheck, ArrowLeftRight } from "lucide-react";
import ChartOfAccountsPage from "./ChartOfAccountsPage";
import LedgerPage from "./LedgerPage";
import JournalEntryPage from "./JournalEntryPage";
import ChequeWritingPage from "./ChequeWritingPage";
import BankReconciliationListPage from "./BankReconciliationListPage";

const TABS = [
  { key: "chart-of-accounts", label: "Chart of Accounts", short: "COA", icon: Landmark, component: ChartOfAccountsPage },
  { key: "general-ledger", label: "General Ledger", short: "Ledger", icon: BookOpen, component: LedgerPage },
  { key: "journal-entries", label: "Journal Entries", short: "Journals", icon: PenLine, component: JournalEntryPage },
  { key: "cheques", label: "Cheques", short: "Cheques", icon: FileCheck, component: ChequeWritingPage },
  { key: "bank-reconciliation", label: "Bank Reconciliation", short: "Recon", icon: ArrowLeftRight, component: BankReconciliationListPage },
];

const AccountingHubPage = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || "chart-of-accounts");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(({ key, label, short, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
};

export default AccountingHubPage;

import { useState } from "react";
import { Landmark, BookOpen, PenLine, FileCheck, ArrowLeftRight } from "lucide-react";
import ChartOfAccountsPage from "./ChartOfAccountsPage";
import LedgerPage from "./LedgerPage";
import JournalEntryPage from "./JournalEntryPage";
import ChequeWritingPage from "./ChequeWritingPage";
import BankReconciliationListPage from "./BankReconciliationListPage";

const TABS = [
  { key: "chart-of-accounts", label: "Chart of Accounts", icon: Landmark, component: ChartOfAccountsPage },
  { key: "general-ledger", label: "General Ledger", icon: BookOpen, component: LedgerPage },
  { key: "journal-entries", label: "Journal Entries", icon: PenLine, component: JournalEntryPage },
  { key: "cheques", label: "Cheques", icon: FileCheck, component: ChequeWritingPage },
  { key: "bank-reconciliation", label: "Bank Reconciliation", icon: ArrowLeftRight, component: BankReconciliationListPage },
];

const AccountingHubPage = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || "chart-of-accounts");
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

export default AccountingHubPage;

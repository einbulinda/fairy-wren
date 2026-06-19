import { useSearchParams } from "react-router";
import { Landmark, BookOpen, PenLine, FileCheck, ArrowLeftRight } from "lucide-react";
import ChartOfAccountsPage from "./ChartOfAccountsPage";
import LedgerPage from "./LedgerPage";
import JournalEntryPage from "./JournalEntryPage";
import ChequeWritingPage from "./ChequeWritingPage";
import BankReconciliationListPage from "./BankReconciliationListPage";

const TABS = [
  { key: "chart-of-accounts",   label: "Chart of Accounts",   short: "COA",     icon: Landmark,       component: ChartOfAccountsPage },
  { key: "general-ledger",      label: "General Ledger",       short: "Ledger",  icon: BookOpen,       component: LedgerPage },
  { key: "journal-entries",     label: "Journal Entries",      short: "Journals",icon: PenLine,        component: JournalEntryPage },
  { key: "cheques",             label: "Cheques",              short: "Cheques", icon: FileCheck,      component: ChequeWritingPage },
  { key: "bank-reconciliation", label: "Bank Reconciliation",  short: "Recon",   icon: ArrowLeftRight, component: BankReconciliationListPage },
];

const AccountingHubPage = ({ defaultTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || defaultTab || "chart-of-accounts";
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar — desktop only; mobile uses contextual bottom nav */}
      <div className="hidden md:block border-b border-surface-700 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
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

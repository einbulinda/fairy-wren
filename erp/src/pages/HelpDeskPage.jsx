import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  LifeBuoy,
  BarChart3,
  Receipt,
  Package,
  Truck,
  Landmark,
  LineChart,
  Users,
  Settings,
  ShoppingCart,
  ArrowLeftRight,
  FileText,
  UserPlus,
  Lock,
  RefreshCw,
  Tag,
  ClipboardList,
  PenLine,
  CreditCard,
  TrendingUp,
  Globe,
} from "lucide-react";

const CATEGORIES = [
  { key: "all",        label: "All Topics" },
  { key: "start",     label: "Getting Started" },
  { key: "sales",     label: "Sales" },
  { key: "inventory", label: "Inventory" },
  { key: "products",  label: "Products" },
  { key: "purchasing",label: "Purchasing" },
  { key: "accounting",label: "Accounting" },
  { key: "reports",   label: "Reports" },
  { key: "users",     label: "Users & Settings" },
];

const GUIDES = [
  // ── GETTING STARTED ─────────────────────────────────────────────────────────
  {
    id: "gs-1",
    category: "start",
    icon: BarChart3,
    title: "Navigating the ERP",
    content: [
      {
        heading: "Desktop",
        body: "The sidebar on the left gives access to all modules. Click a section header to expand or collapse it. Use the arrow at the bottom to collapse the sidebar to icon-only mode for more working space.",
      },
      {
        heading: "Mobile",
        body: "Tap the hamburger icon (☰) at the top-left to open the full navigation menu. A context-sensitive bottom bar also appears on major pages showing the most-used tabs for that section.",
      },
      {
        heading: "Quick tip",
        body: "Your profile and account settings are accessible from the user icon at the top-right of the header.",
      },
    ],
  },
  {
    id: "gs-2",
    category: "start",
    icon: Lock,
    title: "User Roles and Permissions",
    content: [
      {
        heading: "Owner",
        body: "Full access to all modules including user management, role configuration, financial reports, and system settings.",
      },
      {
        heading: "Manager",
        body: "Access to operations, purchasing, inventory, and accounting. Can approve payments and item exchanges. Cannot change system roles or delete users.",
      },
      {
        heading: "Cashier / Staff",
        body: "Can create bills, add items to rounds, and submit payments for approval. Cannot directly confirm payments or access financial reports.",
      },
      {
        heading: "Changing roles",
        body: "Go to Users → System Roles to view and edit what each role can do. Assign a role to a user under Users → Users.",
      },
    ],
  },

  // ── SALES ───────────────────────────────────────────────────────────────────
  {
    id: "sales-1",
    category: "sales",
    icon: Receipt,
    title: "Creating a Bill",
    content: [
      {
        heading: "Start a new bill",
        body: "In the POS screen, tap '+ New Bill'. Optionally enter the customer name. The bill is created immediately and assigned an ID.",
      },
      {
        heading: "Adding items",
        body: "Search for a product by name or scroll the product list. Tap a product to add it to the active round. Adjust quantity using the +/- buttons.",
      },
      {
        heading: "Multiple rounds",
        body: "Each time a new set of items is served or added, it goes into a new round. Rounds are numbered automatically and help track what was ordered at each stage.",
      },
      {
        heading: "Posting a round",
        body: "After adding items tap 'Post Round' to save it. Posted rounds are locked and inventory is deducted.",
      },
    ],
  },
  {
    id: "sales-2",
    category: "sales",
    icon: CreditCard,
    title: "Processing Payment",
    content: [
      {
        heading: "Opening the payment screen",
        body: "With a bill open in POS, tap the 'Pay' button. The system shows the bill total, amount already paid, and the remaining balance.",
      },
      {
        heading: "Splitting payment",
        body: "Add multiple payment lines to split across Cash and M-Pesa. Each line shows the method and amount. The screen tracks the remaining balance in real time.",
      },
      {
        heading: "Cashier vs. approver flow",
        body: "Cashiers submit payments as 'Pending' — the bill moves to 'Awaiting Confirmation'. A user with the 'Approve Payments' permission then confirms them, which finalises the bill.",
      },
      {
        heading: "Direct payment (managers/owners)",
        body: "Users with approve permissions can skip the pending step — their payments are confirmed immediately and the bill closes as 'Completed' when the balance reaches zero.",
      },
    ],
  },
  {
    id: "sales-3",
    category: "sales",
    icon: ArrowLeftRight,
    title: "Exchanging an Item",
    content: [
      {
        heading: "When exchanges are allowed",
        body: "An item can be exchanged up to 6 hours after its round was posted, and only while the bill is still 'Open'. The item must not have been exchanged before.",
      },
      {
        heading: "How to exchange",
        body: "Open the bill, find the item to return, and tap 'Exchange'. Select the replacement product and quantity, enter the authorizer PIN, and confirm.",
      },
      {
        heading: "How it affects the bill total",
        body: "The returned item's value is subtracted from the bill total (credit), and the replacement item's value is added. Only the net difference is owed.",
      },
      {
        heading: "Inventory",
        body: "The original item is returned to stock; the replacement item is deducted from stock immediately.",
      },
    ],
  },
  {
    id: "sales-4",
    category: "sales",
    icon: FileText,
    title: "Viewing and Filtering Bills",
    content: [
      {
        heading: "Sales page",
        body: "Go to Sales in the sidebar. Bills are listed with totals, paid amounts, and status. Use the status tabs (All / Open / Closed / Void) to filter.",
      },
      {
        heading: "Date range",
        body: "Use the date pickers at the top of the Sales page to narrow the list to a specific period.",
      },
      {
        heading: "Export",
        body: "Use the Export button to download the current filtered view as a CSV file.",
      },
      {
        heading: "Bill statuses",
        body: "Open — active, payment not yet received. Awaiting Confirmation — payment submitted, awaiting approval. Completed — fully paid. Void — cancelled.",
      },
    ],
  },

  // ── INVENTORY ───────────────────────────────────────────────────────────────
  {
    id: "inv-1",
    category: "inventory",
    icon: Package,
    title: "Checking Stock Levels",
    content: [
      {
        heading: "Inventory overview",
        body: "Go to Inventory → Stock. Products are listed with their current quantity on hand, unit cost, and reorder level.",
      },
      {
        heading: "Low stock alerts",
        body: "Items with quantity below the reorder level are highlighted. Set reorder levels per product in Products → edit a product.",
      },
      {
        heading: "Inventory value",
        body: "The Inventory Reports tab shows total stock value using weighted-average cost (WAC).",
      },
    ],
  },
  {
    id: "inv-2",
    category: "inventory",
    icon: Package,
    title: "Receiving Stock",
    content: [
      {
        heading: "Starting a receipt",
        body: "Go to Inventory → Receive (or Purchasing → Receive). Select the supplier and enter a reference number (e.g., delivery note). Add each product with quantity and unit cost.",
      },
      {
        heading: "Posting the receipt",
        body: "Once all items are entered, tap 'Post'. Stock is added immediately and the weighted-average cost is recalculated for each product.",
      },
      {
        heading: "Approval",
        body: "Some roles require a manager to approve the receipt. After submission, the receipt goes to the Approvals tab until actioned.",
      },
    ],
  },
  {
    id: "inv-3",
    category: "inventory",
    icon: ClipboardList,
    title: "Running a Stock Take",
    content: [
      {
        heading: "Create a stock take",
        body: "Go to Inventory → Stock Take. Tap '+ New Stock Take', give it a name, select the type (full or category), and save.",
      },
      {
        heading: "Count items",
        body: "For each product, enter the physical count. The system shows the system quantity alongside for comparison.",
      },
      {
        heading: "Review and submit",
        body: "Once all counts are entered, submit the stock take for approval. A manager reviews variances and approves or rejects.",
      },
      {
        heading: "Adjustments",
        body: "On approval, inventory is adjusted to match physical counts and the variance is recorded in the adjustment report.",
      },
    ],
  },

  // ── PRODUCTS ────────────────────────────────────────────────────────────────
  {
    id: "prod-1",
    category: "products",
    icon: Tag,
    title: "Adding a New Product",
    content: [
      {
        heading: "Create product",
        body: "Go to Products → Products. Tap '+ Add Product'. Fill in the name, category, selling price, and cost price.",
      },
      {
        heading: "Reorder level",
        body: "Set the minimum stock quantity that triggers a low-stock alert. Leave at 0 if no alert is needed.",
      },
      {
        heading: "Active/Inactive",
        body: "Toggle a product inactive to hide it from the POS without deleting it. Inactive products do not appear in sales but their history is preserved.",
      },
    ],
  },
  {
    id: "prod-2",
    category: "products",
    icon: RefreshCw,
    title: "Product Conversions",
    content: [
      {
        heading: "What is a conversion",
        body: "A conversion turns one product unit into another — for example, converting a crate of beer into individual bottles.",
      },
      {
        heading: "Setting up conversions",
        body: "Open a product, go to the Conversions tab, and add the output product with the conversion ratio. The source product's stock is decremented and the target product's stock is incremented.",
      },
      {
        heading: "Running a conversion",
        body: "In Inventory, use the Convert tab. Select the source product, the target conversion, and the quantity to convert.",
      },
    ],
  },

  // ── PURCHASING ──────────────────────────────────────────────────────────────
  {
    id: "pur-1",
    category: "purchasing",
    icon: Truck,
    title: "Managing Suppliers",
    content: [
      {
        heading: "Add a supplier",
        body: "Go to Purchasing → Suppliers. Tap '+ Add Supplier'. Enter the supplier name, contact details, and their accounts-payable ledger account.",
      },
      {
        heading: "Supplier detail",
        body: "Tap a supplier to open their detail page. You can see all invoices, payments made to them, and their outstanding balance.",
      },
      {
        heading: "Supplier payments",
        body: "To record a payment to a supplier, open their detail page and use the 'Record Payment' section. Payments are matched against outstanding invoices.",
      },
    ],
  },
  {
    id: "pur-2",
    category: "purchasing",
    icon: FileText,
    title: "Pending Invoices",
    content: [
      {
        heading: "What is a pending invoice",
        body: "A pending invoice represents a bill received from a supplier that has not yet been paid. It creates an accounts-payable liability.",
      },
      {
        heading: "Recording an invoice",
        body: "Go to Purchasing → Invoices. Tap '+ Add Invoice'. Select the supplier, enter the invoice date, reference number, and line items.",
      },
      {
        heading: "Approving an invoice",
        body: "Submitted invoices appear under Invoices for a manager to review and approve. Approval posts the journal entry (debit Purchases, credit Accounts Payable).",
      },
    ],
  },

  // ── ACCOUNTING ──────────────────────────────────────────────────────────────
  {
    id: "acc-1",
    category: "accounting",
    icon: Landmark,
    title: "Chart of Accounts",
    content: [
      {
        heading: "Overview",
        body: "The Chart of Accounts (COA) lists every ledger account used in the system. Accounts are grouped by class: Assets, Liabilities, Equity, Revenue, and Expenses.",
      },
      {
        heading: "Adding an account",
        body: "Go to Accounting → Chart of Accounts. Tap '+ Add Account'. Enter the code, name, type (debit/credit normal), and parent account if it is a sub-account.",
      },
      {
        heading: "System accounts",
        body: "Some accounts are used automatically by the system (e.g., Cash, Accounts Payable, Sales Revenue). Renaming them is safe; deleting them may break posting.",
      },
    ],
  },
  {
    id: "acc-2",
    category: "accounting",
    icon: PenLine,
    title: "Journal Entries",
    content: [
      {
        heading: "Manual entries",
        body: "Go to Accounting → Journal Entries. Tap '+ New Entry'. Add debit and credit lines ensuring the entry balances (total debits = total credits).",
      },
      {
        heading: "Auto-generated entries",
        body: "The system automatically posts journal entries for sales, cost of goods sold (COGS), supplier payments, and cheques. These appear in the journal list with the relevant source type.",
      },
      {
        heading: "General Ledger",
        body: "View a running balance for any account in Accounting → General Ledger. Filter by account and date range to see all transactions affecting that account.",
      },
    ],
  },
  {
    id: "acc-3",
    category: "accounting",
    icon: ArrowLeftRight,
    title: "Bank Reconciliation",
    content: [
      {
        heading: "Creating a statement",
        body: "Go to Accounting → Bank Reconciliation. Select the bank account and tap '+ New Statement'. Enter the statement date, opening and closing balances, then import or manually enter each bank line.",
      },
      {
        heading: "Matching transactions",
        body: "Each bank line is matched to a journal entry in the system. Lines turn green when matched. Unmatched lines show in red and require investigation.",
      },
      {
        heading: "Completing reconciliation",
        body: "Once all lines are matched and the cleared balance equals the closing balance, mark the statement as reconciled.",
      },
    ],
  },
  {
    id: "acc-4",
    category: "accounting",
    icon: FileText,
    title: "Writing Cheques",
    content: [
      {
        heading: "Creating a cheque",
        body: "Go to Accounting → Cheques (or Cheques in the sidebar). Tap '+ Write Cheque'. Select the bank account, payee, amount, and the expense account to debit.",
      },
      {
        heading: "Posting",
        body: "Posting a cheque creates a journal entry (debit Expense, credit Bank) and reduces the bank account balance.",
      },
    ],
  },

  // ── REPORTS ─────────────────────────────────────────────────────────────────
  {
    id: "rep-1",
    category: "reports",
    icon: LineChart,
    title: "Financial Reports Overview",
    content: [
      {
        heading: "Available reports",
        body: "Go to Financial Reports. The available reports are: Income Statement (Profit & Loss), Balance Sheet, Trial Balance, Cash Flow Statement, and Statement of Changes in Equity.",
      },
      {
        heading: "Date filtering",
        body: "Each report has a date range selector. Change the period to see results for any time range. Reports refresh automatically when the dates change.",
      },
      {
        heading: "Exporting",
        body: "Use the Print or Export button on each report to download or print the statement.",
      },
    ],
  },
  {
    id: "rep-2",
    category: "reports",
    icon: TrendingUp,
    title: "Income Statement",
    content: [
      {
        heading: "What it shows",
        body: "Revenue minus cost of goods sold gives Gross Profit. Deducting operating expenses gives Net Profit (or Loss) for the period.",
      },
      {
        heading: "Revenue",
        body: "All sales from completed bills in the selected period appear as Revenue.",
      },
      {
        heading: "COGS",
        body: "Cost of Goods Sold is calculated automatically using the weighted-average cost at the time of each sale.",
      },
    ],
  },

  // ── USERS & SETTINGS ────────────────────────────────────────────────────────
  {
    id: "usr-1",
    category: "users",
    icon: UserPlus,
    title: "Adding a New User",
    content: [
      {
        heading: "Create user",
        body: "Go to Users → Users. Tap '+ Add User'. Enter the name, email address, and choose their system role.",
      },
      {
        heading: "PIN",
        body: "Each user is assigned a PIN used to authorise sensitive actions (e.g., approving item exchanges). Set it during user creation or update it from the user's profile.",
      },
      {
        heading: "Deactivating a user",
        body: "Toggle a user inactive to prevent them from logging in. Their history and transactions are preserved.",
      },
    ],
  },
  {
    id: "usr-2",
    category: "users",
    icon: Users,
    title: "Roles and Permissions",
    content: [
      {
        heading: "System roles",
        body: "Roles define what actions a user can perform. Go to Users → System Roles to see each role's permission set.",
      },
      {
        heading: "Editing a role",
        body: "Select a role and toggle individual permissions on or off. Changes apply immediately to all users assigned that role.",
      },
      {
        heading: "Key permissions",
        body: "approve_payments — confirm pending payments and close bills. exchange_items — authorise item swaps. view_reports — access financial reports. manage_users — add, edit, or deactivate users.",
      },
    ],
  },
  {
    id: "usr-3",
    category: "users",
    icon: Settings,
    title: "Organisation Settings",
    content: [
      {
        heading: "Business details",
        body: "Go to Settings → Organisation. Update the business name, contact information, and logo used on printed documents.",
      },
      {
        heading: "Account classes",
        body: "Settings → Account Classes defines the grouping for bank accounts used in reconciliation (e.g., current accounts vs. savings).",
      },
      {
        heading: "Inventory policies",
        body: "Settings → Inventory Policies controls whether stock can go negative and the method used for cost calculation.",
      },
    ],
  },
  {
    id: "usr-4",
    category: "users",
    icon: TrendingUp,
    title: "Staff and Business Targets",
    content: [
      {
        heading: "Setting targets",
        body: "Go to Users → Staff Targets. Select a date range and set individual revenue targets for each staff member.",
      },
      {
        heading: "Business targets",
        body: "Go to Settings → Business Targets to set overall revenue, gross margin, and other KPI goals for the business.",
      },
      {
        heading: "Tracking performance",
        body: "Target progress is shown on the Dashboard under the Operations tab, comparing actual results against the set targets for the current period.",
      },
    ],
  },
  {
    id: "web-1",
    category: "users",
    icon: Globe,
    title: "Web Management",
    content: [
      {
        heading: "Overview",
        body: "Web Management controls content shown on the public-facing website: events, gallery, reservations, and customer feedback.",
      },
      {
        heading: "Events",
        body: "Create and publish events with dates, descriptions, and poster images. Published events appear on the website automatically.",
      },
      {
        heading: "Reservations",
        body: "View and manage table or space reservations submitted through the website.",
      },
      {
        heading: "Feedback",
        body: "Customer feedback submitted via the website appears under Web → Feedback for review.",
      },
    ],
  },
  {
    id: "sales-5",
    category: "sales",
    icon: ShoppingCart,
    title: "Voiding a Bill",
    content: [
      {
        heading: "When to void",
        body: "Void a bill when the entire transaction needs to be cancelled. Voiding reverses all inventory movements associated with the bill.",
      },
      {
        heading: "How to void",
        body: "Open the bill in Sales. Use the Void option from the bill actions menu. Enter the reason and confirm.",
      },
      {
        heading: "Effect on reporting",
        body: "Voided bills are excluded from revenue and COGS calculations. They remain visible in the Sales list with 'Void' status for audit purposes.",
      },
    ],
  },
];

const GuideItem = ({ guide }) => {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;

  return (
    <div className="border border-surface-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-800/50 transition-colors"
      >
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600/15">
          <Icon size={15} className="text-primary-400" strokeWidth={1.8} />
        </div>
        <span className="flex-1 text-[13px] font-medium text-white">{guide.title}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-surface-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-surface-700/60">
          {guide.content.map((section, i) => (
            <div key={i}>
              <p className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">
                {section.heading}
              </p>
              <p className="text-[13px] text-surface-300 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HelpDeskPage = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUIDES.filter((g) => {
      const matchesCategory =
        activeCategory === "all" || g.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      if (g.title.toLowerCase().includes(q)) return true;
      return g.content.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q),
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600/20 mt-0.5">
          <LifeBuoy size={20} className="text-primary-400" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Help Desk</h1>
          <p className="text-[13px] text-surface-400 mt-0.5">
            User guides and how-tos for the Fairy Wren ERP
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400"
          strokeWidth={2}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              activeCategory === key
                ? "bg-primary-600/30 text-primary-300 border border-primary-500/40"
                : "bg-surface-800 text-surface-400 border border-surface-700 hover:text-white hover:border-surface-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-surface-500">
          <LifeBuoy size={32} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">No guides found for &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-surface-500 font-medium">
            {filtered.length} guide{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "all"
              ? ` in ${CATEGORIES.find((c) => c.key === activeCategory)?.label}`
              : ""}
          </p>
          {filtered.map((guide) => (
            <GuideItem key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpDeskPage;

# Fairy Wren ERP App - Stack & Architecture Plan

## 1. Objective

Separate management concerns from the daily transactional POS app into a dedicated ERP application. The shared API backend will serve both apps with role-based access control enforced at the API layer.

### What Stays in POS

- Order entry / bill management
- Payment processing (cash, M-Pesa)
- Bartender confirmation workflow
- Round management
- Receipt generation

### What Moves to ERP

- Dashboard & analytics
- Inventory management & stock takes
- Product & category management
- Supplier management (cash & accrual purchases, supplier statements)
- Expense management & journal entries
- Cheque writing / posting
- Chart of accounts / general ledger
- Payroll (salaries due & paid)
- User management
- Approval workflows
- Audit logs
- **Financial Reports**: Income Statement, Balance Sheet, Cash Flow Statement, Statement of Changes in Equity

---

## 2. ERP Modules Overview

### 2.1 Supplier Management (Enhanced)

Suppliers sell inventory on **cash or accrual basis**:

| Feature | Details |
|---------|---------|
| Supplier profiles | Contact info, payment terms, credit limits |
| Purchase types | **Cash purchases** (paid immediately) and **credit purchases** (accrual - pay later) |
| Supplier invoices | Record supplier invoices against goods received |
| Supplier payments | Record payments made against outstanding invoices |
| Supplier statements | View outstanding balances per supplier, aging analysis (30/60/90 days) |
| Purchase history | Full transaction history per supplier |

### 2.2 Payroll Module (New)

| Feature | Details |
|---------|---------|
| Employee records | Link to existing user profiles, salary/wage details |
| Salary structure | Basic pay, allowances, deductions |
| Payroll runs | Monthly payroll processing, calculate net pay |
| Payment tracking | Record salaries paid vs due, payment method (cash/bank/M-Pesa) |
| Payroll reports | Summary by period, individual payslips |
| GL integration | Auto-post salary expense and liability journal entries |

### 2.3 Financial Reporting (New)

| Report | Details |
|--------|---------|
| **Income Statement** | Revenue (from POS sales) less COGS, operating expenses, payroll - for selected period |
| **Balance Sheet** | Assets, liabilities, equity as at a selected date |
| **Cash Flow Statement** | Operating, investing, financing activities for selected period |
| **Statement of Changes in Equity** | Capital contributions, retained earnings, drawings for selected period |

All financial reports will pull from the general ledger and should support:

- Period selection (monthly, quarterly, yearly, custom range)
- Comparative periods (this month vs last month, this year vs last year)
- Export to Excel / PDF

### 2.4 Journal Entries & Cheque Writing (New)

| Feature | Details |
|---------|---------|
| **Journal entries** | Manual debit/credit entries for expenses, adjustments, accruals |
| **Cheque writing** | Issue cheques against bank accounts, track cheque numbers, print-ready format |
| **Cheque register** | List of all cheques issued, status (issued, cleared, voided) |
| **Posting** | All entries auto-post to the general ledger |
| **Approval workflow** | Journal entries above a threshold require manager/owner approval |

### 2.5 Existing Modules (Migrated from POS)

- Dashboard & analytics
- Inventory management & stock takes
- Product & category management
- Chart of accounts / general ledger
- Expense management
- User management
- Approval workflows
- Audit logs

---

## 3. Stack Recommendation

### Core: Align with POS Stack

The ERP should use the **same core stack** as the POS for consistency, with targeted additions for data-heavy management workflows.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | React 19 | Same as POS - shared knowledge |
| **Build Tool** | Vite 7 | Same as POS - fast, proven |
| **Language** | JavaScript (JSX) | Same as POS - consistency |
| **Styling** | Tailwind CSS 4 | Same engine, but with a **distinct professional theme** (slate/blue vs POS pink/purple) |
| **Routing** | React Router 7 | Proper multi-page routing with nested layouts |
| **State Management** | Zustand | Same as POS - lightweight |
| **HTTP Client** | Axios | Same as POS - reuse interceptor patterns |
| **Icons** | Lucide React | Same as POS |
| **Charts** | Recharts | Same as POS - already used for analytics |
| **Notifications** | React Hot Toast | Same as POS |
| **Date Handling** | date-fns | Same as POS |

### New Libraries for ERP

| Library | Purpose | Why |
|---------|---------|-----|
| **@tanstack/react-table** | Data tables | ERP is table-heavy (supplier statements, ledger, payroll, cheque register). Provides sorting, filtering, pagination out of the box |
| **@tanstack/react-query** | Server state & caching | Dashboards pulling multiple endpoints, paginated lists, background refetching. Better than manual useEffect patterns |
| **react-hook-form** | Form management | Complex forms (journal entries with multiple lines, cheque writing, payroll setup, supplier invoices) |
| **zod** | Schema validation | Pairs with react-hook-form. Critical for financial data integrity (balanced journal entries, valid amounts) |
| **@hookform/resolvers** | Zod + react-hook-form bridge | Connects zod schemas to form validation |
| **xlsx** | Excel export | Export financial reports, supplier statements, payroll summaries |
| **@react-pdf/renderer** | PDF generation | Print-ready cheques, payslips, financial statements |

---

## 4. Project Structure

```
erp/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx                         # Root with React Router & React Query provider
│   ├── api/                            # HTTP client (adapted from POS pattern)
│   │   ├── client.js
│   │   ├── token.service.js
│   │   ├── auth.interceptor.js
│   │   └── error.interceptor.js
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── inventory/
│   │   │   ├── InventoryListPage.jsx
│   │   │   └── StockTakePage.jsx
│   │   ├── products/
│   │   │   ├── ProductListPage.jsx
│   │   │   └── ProductFormPage.jsx
│   │   ├── suppliers/
│   │   │   ├── SupplierListPage.jsx
│   │   │   ├── SupplierDetailPage.jsx  # Profile + statement view
│   │   │   └── PurchaseEntryPage.jsx   # Record cash/credit purchases
│   │   ├── accounting/
│   │   │   ├── ChartOfAccountsPage.jsx
│   │   │   ├── LedgerPage.jsx
│   │   │   ├── JournalEntryPage.jsx    # Create/post journal entries
│   │   │   ├── ChequeWritingPage.jsx   # Issue & manage cheques
│   │   │   └── ExpensesPage.jsx
│   │   ├── payroll/
│   │   │   ├── PayrollDashboardPage.jsx
│   │   │   ├── EmployeeSetupPage.jsx   # Salary structure per employee
│   │   │   ├── PayrollRunPage.jsx      # Process monthly payroll
│   │   │   └── PayslipPage.jsx
│   │   ├── reports/
│   │   │   ├── IncomeStatementPage.jsx
│   │   │   ├── BalanceSheetPage.jsx
│   │   │   ├── CashFlowPage.jsx
│   │   │   ├── EquityChangesPage.jsx
│   │   │   ├── SalesReportsPage.jsx
│   │   │   └── PerformanceAnalyticsPage.jsx
│   │   ├── users/
│   │   │   └── UserManagementPage.jsx
│   │   └── approvals/
│   │       └── ApprovalsPage.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx            # Sidebar + header + content
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   ├── ui/                         # Base primitives
│   │   │   ├── DataTable.jsx           # TanStack Table wrapper
│   │   │   ├── Modal.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Badge.jsx
│   │   ├── charts/
│   │   ├── forms/                      # Reusable form fields
│   │   │   ├── FormField.jsx
│   │   │   ├── SelectField.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   └── CurrencyInput.jsx
│   │   ├── accounting/
│   │   │   ├── JournalEntryForm.jsx    # Multi-line debit/credit form
│   │   │   └── ChequeForm.jsx
│   │   └── reports/
│   │       ├── ReportFilters.jsx       # Period selector, comparatives
│   │       └── ReportExportBar.jsx     # Excel/PDF export buttons
│   ├── hooks/
│   ├── services/                       # API service layer
│   ├── store/
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── utils/
│   │   ├── constants.js
│   │   ├── permissions.js
│   │   └── formatters.js              # Currency, date, accounting formats
│   └── styles/
│       └── index.css
├── index.html
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## 5. Authentication & Security

### 5.1 Role Gating

| App | Allowed Roles |
|-----|---------------|
| POS | All roles (waitress, bartender, manager, owner, admin) |
| ERP | Manager, owner, admin only |

On ERP login, the app checks the user's role from the JWT payload. If the role is not permitted, access is denied with a clear message.

### 5.2 API-Level Changes Needed

| Change | Details |
|--------|---------|
| **CORS origins** | Add `localhost:5174` (dev) and `erp.fairywren.co.ke` (prod) |
| **Role middleware** | Create `requireRole(...roles)` middleware for sensitive routes (users, accounts, payroll, suppliers) |
| **Audit source** | Accept `X-Source-App` header to distinguish POS vs ERP actions in audit logs |
| **Session duration** | ERP tokens can be longer-lived (8 hours) for office use |

---

## 6. New API Modules Required

The existing API modules cover most needs, but these are **new**:

### 6.1 Payroll Module

```
api/src/modules/payroll/
├── payroll.controller.js
├── payroll.service.js
├── payroll.repository.js
├── payroll.routes.js
├── payroll.schemas.js
└── payroll.docs.js
```

**Endpoints**:
- `GET /payroll/employees` - List employees with salary info
- `PUT /payroll/employees/:id` - Update salary structure
- `POST /payroll/runs` - Process a payroll run
- `GET /payroll/runs` - List payroll runs
- `GET /payroll/runs/:id/payslips` - Get payslips for a run
- `POST /payroll/runs/:id/pay` - Record payment of a payroll run

### 6.2 Journal Entries Module

```
api/src/modules/journals/
├── journals.controller.js
├── journals.service.js
├── journals.repository.js
├── journals.routes.js
└── journals.schemas.js
```

**Endpoints**:
- `POST /journals` - Create a journal entry (array of debit/credit lines, must balance)
- `GET /journals` - List journal entries with filters
- `GET /journals/:id` - Journal entry detail
- `POST /journals/:id/approve` - Approve a pending entry
- `POST /journals/:id/void` - Void an entry (creates reversing entry)

### 6.3 Cheques Module

```
api/src/modules/cheques/
├── cheques.controller.js
├── cheques.service.js
├── cheques.repository.js
├── cheques.routes.js
└── cheques.schemas.js
```

**Endpoints**:
- `POST /cheques` - Issue a cheque (creates journal entry automatically)
- `GET /cheques` - Cheque register with filters
- `PATCH /cheques/:id/clear` - Mark cheque as cleared
- `PATCH /cheques/:id/void` - Void a cheque (creates reversing entry)

### 6.4 Financial Reports Module

```
api/src/modules/financial-reports/
├── financial-reports.controller.js
├── financial-reports.service.js
├── financial-reports.repository.js
└── financial-reports.routes.js
```

**Endpoints**:
- `GET /financial-reports/income-statement?from=&to=`
- `GET /financial-reports/balance-sheet?as_at=`
- `GET /financial-reports/cash-flow?from=&to=`
- `GET /financial-reports/equity-changes?from=&to=`

These aggregate data from the general ledger by account classification.

### 6.5 Supplier Enhancements

Extend existing `api/src/modules/suppliers/`:

**New Endpoints**:
- `GET /suppliers/:id/statement?from=&to=` - Supplier statement (invoices, payments, running balance)
- `GET /suppliers/:id/aging` - Aging analysis (current, 30, 60, 90+ days)
- `POST /suppliers/:id/invoices` - Record a supplier invoice (cash or credit)
- `POST /suppliers/:id/payments` - Record payment to supplier

---

## 7. Database Changes Required

New tables needed in Supabase:

```sql
-- Payroll
employee_salary_structures   -- salary, allowances, deductions per employee
payroll_runs                 -- monthly payroll processing records
payroll_run_lines            -- individual employee lines per run
payroll_payments             -- payment records against payroll runs

-- Journal Entries
journal_entries              -- header (date, narration, status, source)
journal_entry_lines          -- debit/credit lines (account_id, amount, type)

-- Cheques
cheques                      -- cheque_no, bank_account, payee, amount, status, date

-- Supplier Enhancements
supplier_invoices            -- invoice_no, supplier_id, amount, date, payment_terms, status
supplier_payments            -- payment against invoices, amount, method, date
```

---

## 8. Development Setup

### Dev Ports

| App | Port |
|-----|------|
| API | 8000 |
| POS | 5173 |
| ERP | 5174 |

### Root package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix api\" \"npm run dev --prefix pos\" \"npm run dev --prefix erp\"",
    "dev:api": "npm run dev --prefix api",
    "dev:pos": "concurrently \"npm run dev --prefix api\" \"npm run dev --prefix pos\"",
    "dev:erp": "concurrently \"npm run dev --prefix api\" \"npm run dev --prefix erp\"",
    "start": "concurrently \"npm run start --prefix api\" \"npm run start --prefix pos\" \"npm run start --prefix erp\""
  }
}
```

---

## 9. Visual Distinction

| Aspect | POS | ERP |
|--------|-----|-----|
| **Color scheme** | Pink/purple nightclub theme | Slate/blue professional theme |
| **Layout** | Full-screen, touch-optimized | Sidebar navigation, desktop-optimized |
| **Typography** | Large tap targets | Standard desktop sizing |
| **Navigation** | Minimal tabs | Left sidebar with collapsible sections |
| **Target device** | Tablets at the bar | Desktop/laptop in office |

---

## 10. ERP Dependencies

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router": "^7.10.1",
    "axios": "^1.13.2",
    "zustand": "^5.0.11",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "recharts": "^3.6.0",
    "lucide-react": "^0.560.0",
    "react-hot-toast": "^2.6.0",
    "date-fns": "^4.1.0",
    "xlsx": "^0.18.x",
    "@react-pdf/renderer": "^4.x"
  },
  "devDependencies": {
    "vite": "^7.2.4",
    "@vitejs/plugin-react": "^4.x",
    "@tailwindcss/vite": "^4.1.17",
    "tailwindcss": "^4.1.17",
    "eslint": "^9.x"
  }
}
```

---

## 11. Migration Phases

### Phase 1: Scaffold & Auth
- Initialize Vite + React in `erp/`
- Tailwind with professional theme
- Axios client with auth interceptors
- AppShell layout with sidebar
- Login page with role guard

### Phase 2: Dashboard & Existing Reports
- Migrate Dashboard and PerformanceAnalytics from POS
- Wire up with React Query

### Phase 3: Accounting Core
- Chart of Accounts & General Ledger pages
- **Journal entry interface** (multi-line debit/credit form with balance validation)
- **Cheque writing interface** (issue, register, void)
- Expense management

### Phase 4: Supplier Management
- Supplier list with cash/credit purchase recording
- **Supplier statements** (outstanding balances, aging)
- Supplier payment recording

### Phase 5: Inventory & Products
- Migrate inventory management and stock takes
- Migrate product/category management
- Build data tables with TanStack Table

### Phase 6: Payroll
- Employee salary setup
- Monthly payroll run processing
- Payment tracking
- Payslip generation (PDF)

### Phase 7: Financial Reports
- **Income Statement**
- **Balance Sheet**
- **Cash Flow Statement**
- **Statement of Changes in Equity**
- Period selection & comparatives
- Excel/PDF export

### Phase 8: Users, Approvals & Cleanup
- Migrate user management and approvals
- Remove migrated features from POS
- POS becomes a focused transactional app

---

## 12. Deployment

| Concern | Recommendation |
|---------|---------------|
| **POS hosting** | `pos.fairywren.co.ke` - tablets/touch at the bar |
| **ERP hosting** | `erp.fairywren.co.ke` - desktop in office |
| **API** | Single deployment serving both apps |
| **Network security** | ERP can optionally be restricted to office network/VPN |
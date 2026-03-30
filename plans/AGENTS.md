# Fairy Wren POS/ERP System - Agent Context

This document provides context for AI agents working on the Fairy Wren POS/ERP system.

## Project Overview

Fairy Wren is a full-featured Point of Sale and Enterprise Resource Planning system with:
- **Frontend**: React applications (POS, ERP, Customer Portal)
- **Backend**: Node.js Express API with Supabase integration
- **Database**: PostgreSQL with Row Level Security
- **Architecture**: Multi-tenant with role-based access control

## Completed Major Features

### 1. End of Period Control ✓
**Status**: Fully Implemented

- **Database**: `accounting_periods` table, `close_accounting_period()` function, `trg_check_period_lock` trigger
- **Service**: `api/src/modules/periods/periods.service.js`
- **Controller**: `api/src/modules/periods/periods.controller.js`
- **Routes**: `api/src/modules/periods/periods.routes.js`

Key capabilities:
- Period locking with database-level enforcement (hard stop via trigger)
- Automated closing entries (net income → retained earnings)
- Audit trail for period reopening
- Date validation for posting transactions

### 2. Inventory Missing Cost Management ✓
**Status**: Fully Implemented

- **Database**: `v_products_missing_cost` view, `backfill_product_cogs()` function, `cogs_backfill_audit` table
- **Service**: `api/src/modules/inventory/inventory.cost.service.js`
- **Controller**: `api/src/modules/inventory/inventory.cost.controller.js`
- **Routes**: `api/src/modules/inventory/inventory.cost.routes.js`

Key capabilities:
- View to identify products with zero-cost sales
- Bulk COGS backfill with automatic journal entries
- Audit trail for all cost corrections
- Optional auto-backfill when cost_price is updated

### 3. Bank Reconciliation ✓
**Status**: Fully Implemented

- **Database**: `bank_statements`/`bank_statement_lines` tables, `auto_match_bank_statement()` function
- **Service**: `api/src/modules/bank-reconciliation/bank-reconciliation.service.js`
- **Controller**: `api/src/modules/bank-reconciliation/bank-reconciliation.controller.js`
- **Routes**: `api/src/modules/bank-reconciliation/bank-reconciliation.routes.js`

Key capabilities:
- Bank statement import with validation
- Auto-matching by date+amount (fuzzy tolerance)
- Manual matching with adjustment support
- Reconciliation finalization with adjustment journals
- Outstanding items reporting

## API Module Registration

Add these routes to `api/src/app.js`:

```javascript
// Period management
const periodRoutes = require("./modules/periods/periods.routes");
app.use("/api/accounting-periods", periodRoutes);

// Inventory cost management
const inventoryCostRoutes = require("./modules/inventory/inventory.cost.routes");
app.use("/api/inventory-cost", inventoryCostRoutes);

// Bank reconciliation
const bankReconciliationRoutes = require("./modules/bank-reconciliation/bank-reconciliation.routes");
app.use("/api/bank-reconciliation", bankReconciliationRoutes);
```

## Account Class Hierarchy

```
Asset
├── current_asset (1000-1499)
│   └── cash (1010)
├── non_current_asset (1500-1999)
├── bank (1020-1099)
└── ar (1200-1299)

Liability
├── current_liability (2000-2499)
│   └── ap (2100-2199)
└── non_current_liability (2500-2999)

Equity (3000-3999)
└── retained_earnings (3900)

Income (4000-4999)
└── service_revenue (4100)

Expense (5000-5999)
Cost of Sales (6000-6999)
└── cogs (6100)
```

## Critical Data Integrity Notes

1. **Revenue Recognition**: Correctly implemented - revenue recognized at point of service (IFRS 15)
2. **Void Process**: Known issue - voided bills reverse COGS but not revenue (A/R balance may accumulate phantom amounts)
3. **Cheque Transfers**: Cash on Hand (1010) ↔ Bank accounts posting correctly
4. **Balance Sheet**: Requires query invalidation (`balance-sheet`, `trial-balance`, `account-ledger`) after financial mutations

## Database Triggers

- `trg_check_period_lock`: Prevents posting to closed periods
- `trg_update_inventory_cost`: Optional auto-backfill on cost updates
- `trg_journal_entry_balance`: Validates debit=credit on journal entries

## Caching Strategy

Frontend uses TanStack Query (React Query). After any financial mutation:
```javascript
queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
```

## Migration Files

- `20260327_001_accounting_periods_control.sql`: Period control system
- `20260327_002_inventory_missing_cost.sql`: COGS backfill system
- `20260327_003_bank_reconciliation.sql`: Bank reconciliation system

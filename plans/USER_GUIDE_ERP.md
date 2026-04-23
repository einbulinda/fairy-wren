# Fairy Wren ERP — Management User Guide

**Audience:** Managers, accountants, HR staff, and inventory supervisors  
**System:** Enterprise Resource Planning portal at erp.fairywren.co.ke

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard](#2-dashboard)
3. [Sales & Bills](#3-sales--bills)
4. [Z-Report](#4-z-report)
5. [Weekly Sales](#5-weekly-sales)
6. [Inventory](#6-inventory)
7. [Products](#7-products)
8. [Financial Reports](#8-financial-reports)
9. [Accounting](#9-accounting)
10. [Purchasing & Suppliers](#10-purchasing--suppliers)
11. [Payroll](#11-payroll)
12. [Cheque Writing](#12-cheque-writing)
13. [Web Hub](#13-web-hub)
14. [Admin](#14-admin)
15. [Quick Reference](#15-quick-reference)

---

## 1. Logging In

1. Open the ERP URL in your browser.
2. Enter your **username** and **password**.
3. Click **Login**.

Your role determines which sections of the ERP are accessible. Contact your system administrator if a section you need is not visible.

---

## 2. Dashboard

The Dashboard is the home screen. It provides an at-a-glance view of the business through four tabs:

### 2.1 Executive Tab

High-level KPIs for ownership and senior management:

- **Today's Revenue** — total sales recorded so far today
- **Weekly Revenue** — rolling 7-day total
- **Monthly Revenue** — current calendar month total
- **Outstanding Bills** — total value of unpaid open bills
- **Sales trend chart** — revenue plotted over recent days/weeks
- **Top sellers** — best-performing products and categories

### 2.2 Financial Tab

Accounting-oriented metrics:

- **Cash balance** — current cash position across accounts
- **Accounts payable** — total owed to suppliers
- **Recent journal entries** — latest double-entry postings
- **Cash flow widget** — inflows vs. outflows for the period

### 2.3 Operations Tab

Day-to-day operational health:

- **Active staff on shift** count
- **Open bills count** and value
- **Inventory alerts** — products at or below reorder level
- **Pending stock take approvals** — submissions awaiting review

### 2.4 Collections Tab

Focus on outstanding debt and cash collection:

- Outstanding bill list sorted by age
- Payment collection summary
- Staff performance on collections

### 2.5 Action Tiles

Quick-action tiles near the top of the dashboard link directly to common workflows (e.g. New Journal, View Open Bills, Approve Stock Take).

### 2.6 Target Progress

Progress bars show performance against revenue targets (daily, weekly, monthly) set in Admin → Settings.

---

## 3. Sales & Bills

Navigate to **Sales** from the main menu.

### 3.1 Viewing bills

The bills list shows all bills with:
- Bill number and date/time
- Customer name
- Status badge (Open, Completed, Awaiting Confirmation, Void)
- Bill total

**Filter and search:**

| Control | Purpose |
|---------|---------|
| Date range picker | Narrow to a specific period |
| Status filter | Show only Open, Completed, etc. |
| Search box | Search by customer name or bill number |

### 3.2 Expanding a bill

Click any row to expand it and see:
- Each round with its items, quantities, and prices
- All payments recorded against the bill (type, amount, timestamp)
- Outstanding balance

### 3.3 Exporting

Use the **Export** button to download the current filtered view as an Excel (.xlsx) or PDF file.

---

## 4. Z-Report

Navigate to **Sales → Z-Report**.

The Z-Report is the authoritative end-of-day reconciliation. The ERP version is more detailed than the POS version and includes all sections below.

### 4.1 Selecting the report date

Use the date picker at the top. It defaults to today.

### 4.2 Bills Summary

| Metric | Meaning |
|--------|---------|
| Total Bills | All bills created on this date |
| Completed | Fully paid |
| Open | Unpaid at end of day |
| Awaiting Confirmation | Payment submitted, pending review |
| Void | Cancelled |
| Total Revenue | All non-void bill values |
| Completed Revenue | Revenue from paid bills only |
| Outstanding Revenue | Value locked in open/awaiting bills |

### 4.3 Payment Breakdown

Shows total collected per payment mode (Cash, M-Pesa, Card, Cheque, Credit) with transaction count.

Within the payment mode detail rows:
- Each bill shows the **amount paid by that specific mode** (not the full bill total).
- A colour-coded footer summarises: Cash | M-Pesa | Card | Outstanding | Bill Total.

### 4.4 Outstanding Bills Movement

Four tiles showing the movement of outstanding debt through the day:

| Tile | Meaning | Clickable? |
|------|---------|-----------|
| **Opening Balance** | All pre-existing open bills at day start | No |
| **+ Added Today** | New bills from today still unpaid | Yes — drill-down list |
| **− Paid Today** | Payments collected today on old bills | Yes — drill-down list |
| **Closing Balance** | Net outstanding at end of day | No |

The percentage badge (green = debt reduced, red = debt increased) compares closing to opening.

**Drill-down modals** (click Added Today or Paid Today):

*Added Today modal* — Customer | Server | Bill Total | Paid | Outstanding  
*Paid Today modal* — Customer | Server | Bill Total | Paid Today | Remaining Outstanding

### 4.5 Category Sales

Ranked table of categories by total quantity sold and total revenue.

### 4.6 Product Sales (Top 20)

Top 20 products by revenue for the day.

### 4.7 Server Performance

Each staff member's bill count and revenue contribution, ranked by revenue.

### 4.8 Voids

List of all cancelled bills with customer, value, and the staff member who created the bill. Only bills with items are shown.

---

## 5. Weekly Sales

Navigate to **Sales → Weekly Sales**.

Shows a week-by-week sales breakdown with:
- Day-of-week revenue bars
- Top-selling product per day
- Week and month navigation controls

---

## 6. Inventory

Navigate to **Inventory** from the main menu. The page has five tabs:

### 6.1 Stock Levels tab

Current on-hand quantity, reorder point, and cost for every product.

Products at or below their reorder point are highlighted with an alert indicator.

**Export** available as Excel.

### 6.2 Receive Stock tab

Record stock arriving from a supplier:

1. Select the **Supplier**.
2. Select the **Date** of receipt.
3. Add line items: Product, Quantity Received, and Unit Cost.
4. Click **Save Receipt**.

The system updates stock levels and records a purchase against the supplier's account.

### 6.3 Reports tab

Stock movement reports for a selected date range — receipts, adjustments, and net movement per product.

### 6.4 Approvals tab

Stock take submissions from the POS that are pending review:

1. Click a submission to see the counted quantities and variances.
2. Review each line's variance reason.
3. Click **Approve** to accept the count and update system quantities, or **Reject** to send it back for recount.

### 6.5 Conversions tab

Manage product conversions — where one item is produced from others (e.g. a bottle broken down into individual serves). Record conversions here to keep stock levels accurate.

---

## 7. Products

Navigate to **Products** from the main menu.

Manage the full product catalogue:

| Field | Notes |
|-------|-------|
| Name | Product display name |
| Category | Links to the category for POS grouping |
| Selling Price | Price charged to customers |
| Cost Price (WAC) | Weighted average cost — updated automatically on stock receipts |
| Reorder Level | Triggers low-stock alert when on-hand reaches this quantity |
| Active | Uncheck to hide from POS without deleting |

**Weighted Average Cost (WAC):** Each time stock is received at a new cost, the system recalculates WAC automatically. You do not need to enter this manually.

---

## 8. Financial Reports

Navigate to **Financial Reports** from the main menu.

Five report types are available. All support date range selection and PDF/Excel export.

### 8.1 Income Statement (P&L)

Revenue minus Cost of Goods Sold minus operating expenses = net profit for the period.

### 8.2 Balance Sheet

Snapshot of assets, liabilities, and equity at the selected date.

### 8.3 Cash Flow Statement

Operating, investing, and financing cash flows for the period.

### 8.4 Trial Balance

Debit and credit totals for every account — used to verify ledger integrity.

### 8.5 General Ledger

All journal entries for a selected account and date range, with running balance.

---

## 9. Accounting

Navigate to **Accounting** from the main menu.

### 9.1 Chart of Accounts

The master list of all ledger accounts. Accounts are organised by type (Asset, Liability, Equity, Revenue, Expense).

**Adding an account:**
1. Click **New Account**.
2. Set the account code, name, type, and (for bank accounts) mark as bank account.
3. Save.

### 9.2 Journal Entry

Manual double-entry postings for adjustments, accruals, and corrections.

1. Click **New Journal**.
2. Set the date and description/reference.
3. Add debit and credit lines — each line requires an account and amount.
4. The system validates that total debits equal total credits before saving.
5. Click **Post**.

Posted journals cannot be deleted — raise a reversing entry if a correction is needed.

### 9.3 General Ledger

Browse all postings to a selected account over a date range. Shows opening balance, each transaction, and running closing balance.

### 9.4 Bank Reconciliation

Match bank statement lines against transactions in the system:

1. Select the bank account and statement period.
2. Upload or manually enter the statement balance.
3. Tick each system transaction that appears on the statement.
4. The reconciliation panel shows unmatched items and the difference.
5. When the difference is zero, mark the period as **Reconciled**.

---

## 10. Purchasing & Suppliers

### 10.1 Suppliers

Navigate to **Suppliers**.

Manage supplier records:
- Contact details, payment terms, and bank information
- View purchase history and outstanding payables per supplier

### 10.2 Purchasing

Navigate to **Purchasing** (or **Suppliers → Purchases**).

Shows all purchase receipts with supplier, date, and total. Each receipt can be expanded to see line items.

Accounts payable balance per supplier reflects receipts not yet paid.

---

## 11. Payroll

Navigate to **Payroll** from the main menu.

### 11.1 Employee records

Add and maintain employee details:
- Name, ID number, bank details, basic salary, and allowances

### 11.2 Payroll runs

1. Click **New Payroll Run**.
2. Select the pay period (month).
3. The system pre-fills gross pay from employee records. Adjust for deductions, overtime, or advances as needed.
4. Click **Process** to calculate net pay.
5. Download payslips as PDF.

Processed payroll creates a journal entry automatically (debit salary expense, credit cash/bank payable).

---

## 12. Cheque Writing

Navigate to **Cheques** from the main menu.

### 12.1 Writing a cheque

1. Select the **bank account** tab (each bank account has its own tab).
2. Click **New Cheque**.
3. Fill in: Payee, Amount, Date, Cheque Number, and Memo/Description.
4. Click **Save**.

### 12.2 Cheque statuses

| Status | Meaning |
|--------|---------|
| Draft | Saved but not yet issued |
| Issued | Cheque handed to payee |
| Cleared | Bank has processed it |
| Cancelled | Voided before issue |

Update status as the cheque moves through the workflow. Cleared cheques are flagged for bank reconciliation.

---

## 13. Web Hub

Navigate to **Web Hub** from the main menu.

Manage content shown on the public Fairy Wren website (fairywren.co.ke) without touching any code.

### 13.1 Events

Create and manage upcoming events:
- Event name, date, time, description, and poster image
- Events appear on the website Events section automatically

### 13.2 Gallery

Upload and manage photos shown in the website gallery.

### 13.3 Reservations

View table/event booking requests submitted via the website reservation form.

- Review customer details, date, party size, and notes
- Mark reservations as Confirmed or Declined

### 13.4 Feedback

View customer feedback submitted through the website. Read and archive submissions.

---

## 14. Admin

Navigate to **Admin** from the main menu.

Admin is restricted to users with the Administrator role.

### 14.1 Users

Manage staff accounts:

1. Click **New User** to create an account.
2. Set name, email, username, password, and role.
3. Existing users can be edited to change their role, reset their password, or deactivate their account.

### 14.2 Roles & Permissions

Define what each role can see and do:

- The permissions grid shows every module and action (View, Create, Edit, Delete).
- Tick the relevant cells for each role.
- Changes take effect immediately.

Default roles: Administrator, Manager, Bartender, Accountant, Inventory Supervisor.

### 14.3 Settings

System-wide configuration:

| Setting | Notes |
|---------|-------|
| Business name and address | Printed on receipts and reports |
| Currency | Defaults to KES |
| Revenue targets | Daily, weekly, and monthly goals — shown on Dashboard |
| Staff targets | Individual revenue targets per staff member |
| Operating hours | Used in reporting and access controls |

### 14.4 Revenue Targets

Set targets for the business and per staff member:

1. Go to **Admin → Settings → Targets**.
2. Enter the daily, weekly, and monthly revenue goals.
3. For individual staff targets, enter each person's target amount.

These appear as progress bars on the Dashboard Collections tab and Z-Report server performance section.

---

## 15. Quick Reference

| Task | Navigation |
|------|-----------|
| View today's KPIs | Dashboard |
| View and filter all bills | Sales → Bills |
| Run end-of-day report | Sales → Z-Report |
| Approve a stock take | Inventory → Approvals |
| Receive stock from supplier | Inventory → Receive Stock |
| Post a journal entry | Accounting → Journal Entry |
| Reconcile bank statement | Accounting → Bank Reconciliation |
| Process monthly payroll | Payroll → New Payroll Run |
| Write a cheque | Cheques → select bank tab → New Cheque |
| Add a new user | Admin → Users → New User |
| Set revenue targets | Admin → Settings → Targets |
| Manage website events | Web Hub → Events |
| View reservation requests | Web Hub → Reservations |
| Export any report | Use the Export button on the relevant page |

---

*Last updated: April 2026*

# Fairy Wren POS — Staff User Guide

**Audience:** Bartenders, floor staff, and supervisors  
**System:** Point-of-Sale terminal at pos.fairywren.co.ke

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [The POS Screen — Taking an Order](#2-the-pos-screen--taking-an-order)
3. [Managing Payments](#3-managing-payments)
4. [Open Bills](#4-open-bills)
5. [Voiding a Bill](#5-voiding-a-bill)
6. [Stock Take](#6-stock-take)
7. [Z-Report](#7-z-report)
8. [Weekly Sales](#8-weekly-sales)
9. [Switching to Beta UI](#9-switching-to-beta-ui)
10. [Quick Reference](#10-quick-reference)

---

## 1. Logging In

1. Open the POS URL in the browser.
2. Enter your **username** and **password** on the Login screen.
3. Tap **Login**.

After logging in you land on the main POS screen.

> **PIN re-authentication** — if you step away and the session locks, you will be prompted to enter your 4-digit PIN rather than your full password. This keeps things fast at a busy bar.

---

## 2. The POS Screen — Taking an Order

The main screen is split into two panels:

| Panel | What it shows |
|-------|--------------|
| **Left / Product grid** | All products organised by category tabs |
| **Right / Current bill** | The active bill — items, subtotal, action buttons |

### 2.1 Starting a bill

A new blank bill is ready automatically when you land on the POS screen.

Optionally type a **customer name** in the name field at the top of the bill panel before adding items.

### 2.2 Adding items

1. Select a **category tab** across the top of the product grid.
2. Tap the product tile to add one unit. Each tap adds one more unit.
3. The item appears in the bill panel on the right with its quantity and line price.

### 2.3 Adjusting quantities and removing items

- **Increase** — tap the product tile again, or use the **+** button on the line item.
- **Decrease** — use the **−** button. Reaching 0 removes the line.
- **Remove entirely** — tap the red trash icon on the line item.

### 2.4 Rounds

Each time you submit an order to the bar it becomes a **round**. You can add more items later and they will form a second round on the same bill. The bill panel shows all rounds with their timestamps so it is easy to see when each round was ordered.

### 2.5 Sending the order / printing

Tap **Place Order** (or the equivalent submit button) to lock the current round. The bill stays open for further rounds or payment.

---

## 3. Managing Payments

Tap the **Pay / Charge** button at the bottom of the bill panel to open the Payment modal.

### 3.1 Payment modes

| Mode | When to use |
|------|-------------|
| **Cash** | Customer pays with notes/coins |
| **M-Pesa** | Customer sends via mobile money |
| **Card** | Debit or credit card swipe/tap |
| **Cheque** | Business cheque payments |
| **Credit** | Payment deferred/put on account |

### 3.2 Full payment (single mode)

1. Select the payment type (e.g. Cash).
2. Enter the amount — it defaults to the bill total.
3. Tap **Confirm Payment**.

The bill status changes to **Completed** and a receipt is shown.

### 3.3 Split / multi-mode payment

A customer may pay partly in cash and partly via M-Pesa.

1. Select the first payment type and enter the partial amount.
2. Tap **Add** (not Confirm).
3. Select the second payment type and enter the remaining amount.
4. Tap **Confirm Payment**.

The system validates that the total entered equals the bill total before confirming.

### 3.4 Partial payment (run a tab)

If a customer pays a deposit but the bill stays open:

1. Enter the amount paid.
2. Tap **Add** — this records the payment without closing the bill.
3. The bill moves to **Awaiting Confirmation** or remains **Open** depending on how much has been paid.
4. The outstanding balance is visible on the bill and in the Open Bills list.

### 3.5 Receipt

After a completed payment a receipt preview appears. Print it or dismiss it.

---

## 4. Open Bills

Tap the **Open Bills** button (usually in the header bar) to see all bills that are currently open across the venue — not just your own.

### What the modal shows

- The header shows the **total outstanding amount** across all open bills (net of any partial payments already made).
- Each bill tile shows:
  - Customer name (or "Walk-in")
  - **Outstanding balance** — what remains unpaid after any partial payments
  - If a partial payment exists, a secondary line shows the full bill total and the amount already paid.
  - An **"outstanding"** amber badge when partially paid.

### Resuming a bill

Tap any bill tile to load that bill into the active POS screen. You can then add more items or take payment.

---

## 5. Voiding a Bill

A void cancels the entire bill. This is a manager-level action.

1. With the bill loaded, tap the **Void** button.
2. Confirm the prompt.
3. The bill status changes to **Void** and it is excluded from all sales totals.

Voids are visible in the Z-Report void section so management can review them.

---

## 6. Stock Take

The Stock Take screen is used at the end of a period to count physical inventory and reconcile it with system stock levels.

### 6.1 Starting a stock take session

1. Navigate to **Stock Take** from the sidebar.
2. Tap **New Stock Take**.
3. The system creates a session and lists all products.

### 6.2 Counting items

For each product:
1. Enter the physical count in the **Counted** field.
2. If there is a discrepancy, a **Variance** column shows the difference against the system quantity.
3. If the variance requires explanation, select a **variance reason** from the dropdown (e.g. Spillage, Breakage, Theft).

You can save progress and return to continue counting — the session stays open until submitted.

### 6.3 Submitting for approval

Tap **Submit** when all items are counted. The session moves to **Pending Approval** status.

A manager reviews the submission in the ERP and either approves or rejects it. You will see the updated status when you next view the Stock Take screen.

---

## 7. Z-Report

The Z-Report is the end-of-day reconciliation for the current trading day. Run it at close of business.

Navigate to **Z-Report** from the sidebar.

### 7.1 Bills Summary

Shows counts and values for all bill statuses:

| Metric | Meaning |
|--------|---------|
| Total Bills | Every bill created today |
| Completed | Fully paid and closed |
| Open | Still active / unpaid |
| Awaiting Confirmation | Payment submitted, pending confirmation |
| Void | Cancelled bills |
| Total Revenue | Sum of all non-void bills |
| Completed Revenue | Revenue from fully paid bills |
| Outstanding Revenue | Revenue tied up in open/awaiting bills |

### 7.2 Payment Breakdown

A table showing how much was collected by each payment method (Cash, M-Pesa, Card, etc.) with transaction counts.

Each bill row shows the specific amount paid by that payment mode — not the full bill total — so you can reconcile your cash drawer accurately.

The footer under the items shows a colour-coded summary:
- **Green** — Cash total
- **Blue** — M-Pesa total
- **Amber** — Any outstanding balance remaining on this bill
- **White** — Full bill total

### 7.3 Outstanding Bills Movement

A four-tile section showing how outstanding debt moved during the day:

| Tile | Meaning |
|------|---------|
| **Opening Balance** | Total owed on all open bills at the start of the day |
| **+ Added Today** | New bills created today that are still unpaid |
| **− Paid Today** | Payments collected today on pre-existing open bills |
| **Closing Balance** | Total outstanding at end of day |

A percentage badge shows whether outstanding debt increased or decreased compared to the opening balance (green = reduction, red = increase).

**Drill-down modals** — tap the **Added Today** or **Paid Today** tiles to see the individual bills:

- *Added Today* shows each new open bill: customer, server, bill total, and outstanding amount.
- *Paid Today* shows each pre-existing bill that received payment: customer, server, bill total, amount paid today, and remaining outstanding.

### 7.4 Category and Product Sales

Tables showing which categories and products moved the most volume and value during the day.

### 7.5 Server Performance

A ranked table showing each staff member's bill count and revenue for the day.

### 7.6 Voids

Lists each voided bill with the customer name, value, and who created it. Only voids with items are shown.

---

## 8. Weekly Sales

Navigate to **Weekly Sales** from the sidebar.

This view shows sales performance broken down by week, with a day-by-day breakdown and a highlight of the top-selling product for each day.

Use the **week selector** to navigate between weeks, and the **month selector** to jump to a different month.

---

## 9. Switching to Beta UI

The POS has an alternate **Beta UI** with a darker, more modern layout.

To toggle it:
1. Open your account/profile settings (top-right corner).
2. Enable the **Beta UI** toggle.

The Beta UI has the same functionality as the classic view — orders, payments, open bills, stock take, and Z-Report all work identically. The layout is restructured with a split-screen design suited for larger tablet displays.

---

## 10. Quick Reference

| Action | How |
|--------|-----|
| Add item to bill | Tap product tile |
| Remove item | Tap − until 0, or trash icon |
| Take payment | Tap Pay button → select type → Confirm |
| Split payment | Add each mode separately, Confirm last |
| View open bills | Tap Open Bills in header |
| Resume a bill | Tap it in the Open Bills modal |
| Void a bill | Load bill → Void → Confirm |
| Start stock take | Stock Take page → New Stock Take |
| End of day report | Z-Report page |
| Lock / re-auth | Enter PIN when prompted |

---

*Last updated: April 2026*

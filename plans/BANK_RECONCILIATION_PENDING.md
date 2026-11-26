# Bank Reconciliation — Status & Pending Work

_Last updated: 26/11/2026_

## Done — Step 1: make it work end to end

Migration `api/src/database/migrations/20261126_001_bank_reconciliation_realign.sql`:

- Tables converted to the layout the API/ERP use (deposit / withdrawal /
  reference, statement start / end dates). Existing rows kept
  (credit → deposit, debit → withdrawal). Production had the old
  debit/credit layout, so every import would have saved 0 amounts.
- `v_unreconciled_bank_transactions` lists every journal on the bank
  account (previously hid `supplier_payment` and `mpesa_receipt`).
- `v_bank_reconciliation_summary` adds GL balance at the statement end
  date and the variance.
- Functions replaced: `import_bank_statement` (now takes the period),
  `auto_match_bank_statement` (date tolerance), `manual_match_statement_line`,
  `rpc_get_bank_reconciliation`, `rpc_get_suggested_matches`.

API fixes: statement page loads (scalar RPC unwrapped), import returns the
real id, auto-match returns the real count, manual match records the user.

## Pending

### Step 2 — Integrity (next)

- [ ] Lock reconciled / cancelled statements in the API: reject auto-match,
      manual match and unmatch (today only the ERP hides the buttons).
- [ ] Finalise checks balances: statement closing balance vs. GL balance at
      the end date (`v_bank_reconciliation_summary.variance`), not only
      "no unmatched lines".
- [ ] Cancel a statement: route + ERP button (`cancelStatement` exists in
      the service, unused).
- [ ] Block duplicate / overlapping imports for the same bank account and
      period.
- [ ] Manual match: check the journal is on the statement's bank account and
      not already matched.

### ERP navigation

- [ ] Bank Reconciliation is hard to find: it is the 6th tab of
      Finance → Accounting, and on laptop widths the tab bar scrolls off-screen
      with a hidden scrollbar. Add a Finance sidebar item
      ("Bank Reconciliation" → `/accounting?tab=bank-reconciliation`) and make
      the Accounting tabs wrap.

### Step 3 — Adjustments & reporting

- [ ] Post bank charges / interest from an unmatched line (journal + mark the
      line `adjusted`); finalise currently ignores `adjustments`.
- [ ] Reconciliation statement: outstanding cheques and deposits in transit
      explaining the bank vs. book difference.

### Step 4 — M-Pesa / KCB settlements

- [ ] Many-to-one matching (one bank line ↔ several journals), needed because
      KCB settles many M-Pesa receipts as one bank line on 1020.
- [ ] Depends on `KCB_IPN_POST_RECEIPT_JOURNAL=true` at go-live, otherwise
      M-Pesa receipts are not in 1020.

### Housekeeping

- [ ] Tests for the bank-reconciliation module (none exist).
- [ ] `api/migrations/20260330_001_bank_reconciliation.sql` is in a folder the
      migration runner never reads — remove once confirmed redundant.

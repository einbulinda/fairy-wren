# KCB M-Pesa Instant Payment Notifications (IPN) — Analysis & Implementation Plan

_Date: 2026-11-17_

## 1. Goal

When a customer pays by M-Pesa (to a Lipa na KCB / Vooma till via paybill 522533), KCB POSTs an
Instant Payment Notification to our API. We store it, push it live to the POS, and a POS user
**matches it to one or more bills**. Each allocation becomes a confirmed `mpesa` payment, which
settles the bill(s) and posts the usual journal.

This replaces today's flow where cashiers type an M-Pesa amount by hand with nothing to prove the
money arrived.

---

## 2. Analysis of the KCB spec

### 2.1 Endpoints in the spec

| KCB operation | Use for us | Decision |
|---|---|---|
| `POST /till-notification` (`tillIPN`) | Payments to a Vooma / Lipa na KCB till, including M-Pesa through paybill 522533 | **Build (primary)** |
| `POST /account-notification` (`accountIPN`) | Direct credits to a KCB bank account | **Out of scope.** Not live for us (decision 5) |
| `POST /validation` | Optional pre-check for OTC/agency payments | **Skip.** Not needed for till payments |

These are endpoints that **we host** and KCB calls. The `oauth2` security scheme in the swagger
file protects KCB's own gateway and does not apply to our callback. We authenticate KCB with the
**RSA signature**.

### 2.2 Till notification payload (what we read)

```
header.messageID                 KCB request id (unique per delivery attempt?)  → message_id
header.originatorConversationID  optional; echo back
header.channelCode               → channel_code
header.timeStamp                 yyyyMMddHHmmss (EAT)                          → used for transaction_at
requestPayload.primaryData.businessKey      our till / biller code             → business_key
requestPayload.additionalData.notificationData:
  transactionID   UNIQUE receipt (e.g. FT25139M3RM6)  → idempotency key
  transactionAmt  "1000" / "100.00"  (string)         → amount numeric(12,2)
  businessKey     "account no." the customer typed    → bill_reference (often empty or junk)
  debitMSISDN     254711000000                        → msisdn (PII)
  firstName/middleName/lastName                       → payer_name
  currency, narration, transactionType ("MPESA"/"vooma"), balance
  transactionDate  inconsistent: "Mon May 19 13:30:54 EAT 2025" vs "20201102"
```

### 2.3 Response we must return (HTTP 200)

```json
{
  "header": {
    "messageID": "<echo header.messageID>",
    "originatorConversationID": "<echo>",
    "statusCode": "0",
    "statusMessage": "Notification received successfully"
  },
  "responsePayload": { "transactionInfo": { "transactionId": "<our mpesa_transactions.id>" } }
}
```
`statusCode` `"0"` means success and `"1"` means failure.

### 2.4 Gotchas in the spec

1. **The signature covers the raw bytes.** The `Signature` header carries SHA256withRSA over the
   request body. `app.js` runs `express.json()` globally, which discards the original bytes, so the
   raw buffer has to be captured (§4.2). Re-serialising the parsed JSON will not reproduce the bytes
   KCB signed. The spec doesn't say whether KCB signs the exact body or a canonical form, so this
   must be confirmed with real UAT traffic. Log both attempts during UAT.
2. **The header name differs between the PDF and the swagger file** (`signature` in the PDF,
   `Signature` in the swagger file). Express lowercases header names, so read `req.get("signature")`.
3. **`transactionDate` has no fixed format.** Store the raw string. Derive `transaction_at` from
   `header.timeStamp` (`yyyyMMddHHmmss`, Africa/Nairobi) and fall back to receipt time.
4. **Amounts arrive as strings.** Parse to numeric and reject NaN or values ≤ 0.
5. **KCB will retry**, so the endpoint must be idempotent on `transactionID`. A duplicate must still
   get `statusCode "0"` with the same `transactionId`. Otherwise KCB keeps retrying.
6. **The customer-entered reference (`notificationData.businessKey`) can't be trusted.** For till
   payments customers usually type nothing. Matching is therefore a **human step**, with
   system suggestions to help.
7. The sample request has `"businessKeyType": "queryBiller"` while the swagger file has
   `notifyBiller`. Don't validate these constants.

---

## 3. Fit with the existing system

| Existing piece | Relevance |
|---|---|
| `payments` table (`payment_type` in `cash`/`mpesa`, `status` pending/confirmed, **unused `mpesa_code` column**) | IPN allocations become `mpesa` payments with `mpesa_code = transactionID` |
| `process_payment()` (latest: `migrations/20260319_003_…`) | Locks the bill, validates against `bill_totals`, inserts payments, calls `post_payment_journal`, updates bill status. **The new allocation function follows the same pattern**; don't overload `process_payment` |
| `bill_totals` view (`balance_due`, `payable_amount`, `pending_amount`) | Authoritative limit for allocations |
| `post_payment_journal()` | Already journals `mpesa` → Dr **1020** Bank / Cr **1201** A/R. Reuse it unchanged (idempotent on `source_id`) |
| `pg_notify` → `db_changes` → `pg.subscriber.js` → socket.io rooms (`perm:<permission>`) | Add the new table so POS gets `mpesa:received` live |
| `load/routes.js` public vs `authMiddleware` sections | The webhook mounts in the **public** section |
| `apiRateLimiter` (100 req/min/IP, global) | Exempt the webhook or give it its own limiter. KCB bursts at busy times must never get a 429 |
| Bank reconciliation module | Later: auto-match KCB statement lines on `transactionID` |
| Stub files already in `api/src/modules/integrations/kcb.*.js` and empty migration `20261106_001_kcb_ipn.sql` | Fill these in |

**Note:** `api/src/database/functions.sql` contains curly quotes (`‘ open ’`) and wouldn't run as
SQL. This is already the case in HEAD. The migrations are the source of truth, so all new SQL goes
in a migration.

---

## 4. Design

### 4.1 Data model (migration `20261106_001_kcb_ipn.sql`)

```sql
CREATE TABLE mpesa_transactions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source           text NOT NULL CHECK (source IN ('kcb_till','kcb_account')),
  transaction_id   text NOT NULL UNIQUE,           -- KCB receipt, idempotency key
  message_id       text,
  originator_conversation_id text,
  channel_code     text,
  business_key     text,                           -- our till/biller code
  bill_reference   text,                           -- what the customer typed
  msisdn           text,
  payer_name       text,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  currency         text NOT NULL DEFAULT 'KES',
  transaction_type text,
  narration        text,
  transaction_date_raw text,
  transaction_at   timestamptz NOT NULL,
  allocated_amount numeric(12,2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'unallocated'
                   CHECK (status IN ('unallocated','partially_allocated','allocated','ignored')),
  ignored_reason   text,
  raw_payload      jsonb NOT NULL,
  signature_valid  boolean NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (allocated_amount >= 0 AND allocated_amount <= amount)
);
CREATE INDEX ON mpesa_transactions (status, transaction_at DESC);

CREATE TABLE mpesa_allocations (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mpesa_transaction_id uuid NOT NULL REFERENCES mpesa_transactions(id),
  bill_id        uuid NOT NULL REFERENCES bills(id),
  payment_id     uuid NOT NULL REFERENCES payments(id),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  allocated_by   uuid NOT NULL REFERENCES profiles(id),
  allocated_at   timestamptz NOT NULL DEFAULT now(),
  reversed_at    timestamptz,
  reversed_by    uuid REFERENCES profiles(id)
);
CREATE INDEX ON mpesa_allocations (bill_id);
CREATE INDEX ON mpesa_allocations (mpesa_transaction_id);

-- live push
CREATE TRIGGER trg_mpesa_transactions_notify AFTER INSERT OR UPDATE ON mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- permissions
--   allocate_mpesa  → cashiers / bartenders (match IPNs to bills)
--   manage_mpesa    → managers (reverse allocation, mark ignored)
```

The schema is many-to-many, so it covers:
- **one IPN → several bills** (a group pays one lump sum for multiple tabs)
- **several IPNs → one bill** (friends split the bill)
- **leftover amounts** (an overpayment or tip stays `partially_allocated` until a manager handles it)

Rejected or forged requests are **not** written to this table. They are logged (pino/winston),
with an optional `ipn_rejections` table for audit.

### 4.2 Webhook (public)

`kcb.routes.js` mounted in `load/routes.js`, **in the public section, before `authMiddleware`**:

```
POST /integrations/kcb/ipn/till        → controller.tillNotification
POST /integrations/kcb/ipn/account     → controller.accountNotification   (phase 2)
```

Request pipeline:
1. **Capture the raw body.** Change the global parser in `app.js` to
   `express.json({ limit: "2mb", verify: (req, _res, buf) => { req.rawBody = buf; } })`.
   This touches every route only to keep a reference. Alternatively, mount the KCB router with
   `express.raw({ type: "application/json" })` *before* the global `express.json()`.
2. **Rate limiting:** skip `apiRateLimiter` for this path (`skip: req => req.path.startsWith("/integrations/kcb/ipn")`)
   and apply a generous dedicated limiter.
3. **`kcb.signature.js`:** `crypto.createVerify("RSA-SHA256").update(req.rawBody).verify(publicKeyPem, sig, "base64")`.
   The public key PEM is loaded from env `KCB_IPN_PUBLIC_KEY` (or `KCB_IPN_PUBLIC_KEY_PATH`) and cached.
   On failure, return HTTP 200 with `statusCode "1"`, `statusMessage "Invalid signature"`, and log it.
   (Confirm with KCB whether they prefer 401; the spec's error format suggests always 200 + code.)
   Add a `KCB_IPN_VERIFY_SIGNATURE=false` escape hatch for **local dev only**, refused when `NODE_ENV=production`.
4. Optional defense in depth: allowlist KCB's egress IPs (`KCB_IPN_ALLOWED_IPS`). `trust proxy` is already set.
5. **`kcb.service.normaliseTill(body)`** converts the payload to a row and validates the mandatory fields.
6. **`kcb.repository.insertIdempotent(row)`** runs
   `INSERT … ON CONFLICT (transaction_id) DO NOTHING RETURNING id`. On conflict it `SELECT`s the
   existing id.
7. Respond with an ack that echoes `messageID` / `originatorConversationID` and sets
   `transactionId = id`. Insert and respond only; heavier work such as suggestions runs afterwards.
   KCB must get its ack fast.
8. Write an audit log entry (`auditRepo.log`, entity `mpesa_transactions`, action `IPN_RECEIVED`).

### 4.3 Allocation (authenticated)

New SQL function in the same migration, following the `process_payment` pattern:

```
allocate_mpesa_transaction(p_txn_id uuid, p_allocations jsonb /* [{bill_id, amount}] */, p_user_id uuid)
  RETURNS json
```
1. `SELECT … FROM mpesa_transactions WHERE id = p_txn_id FOR UPDATE`. This lock stops two tills
   from claiming the same money.
2. Reject if status is `allocated` or `ignored`, or if `sum(amounts) > amount - allocated_amount`.
3. For each line, **ordered by bill_id to avoid deadlocks**:
   - `SELECT … FROM bills WHERE id = … FOR UPDATE`. The status must be `open` / `awaiting_confirmation`.
   - The amount must be ≤ `bill_totals.payable_amount`.
   - `INSERT INTO payments (bill_id, amount, payment_type='mpesa', mpesa_code=transaction_id, status='confirmed', is_paid=true, created_by, updated_by)`
   - `PERFORM post_payment_journal(payment_id)`
   - `INSERT INTO mpesa_allocations …`
   - Recompute `bill_totals`. If `balance_due <= 0`, set the bill to `completed`. Otherwise keep it
     `open`, or leave it `awaiting_confirmation` if other pending lines exist.
4. Update `mpesa_transactions.allocated_amount` and `status`.
5. Return a json summary of per-bill balances and the remaining unallocated amount.

`reverse_mpesa_allocation(p_allocation_id, p_user_id)` is for managers only. It voids the linked
payment, posts a reversing journal (same pattern as the existing void/cheque reversal), reopens the
bill, and decrements `allocated_amount`. It is needed when a cashier matches the wrong IPN, and when
a bill with IPN payments is voided.

Protected routes (mounted `router.use("/mpesa-transactions", authMiddleware, …)`):

```
GET   /mpesa-transactions?status=unallocated&from&to&q      list (q = name / last digits / receipt)
GET   /mpesa-transactions/:id                               detail + allocations
GET   /mpesa-transactions/:id/suggestions                   candidate bills
POST  /mpesa-transactions/:id/allocate      allocate_mpesa  { allocations: [{billId, amount}] }
POST  /mpesa-allocations/:id/reverse        manage_mpesa
PATCH /mpesa-transactions/:id/ignore        manage_mpesa    { reason }  (e.g. not a bar sale)
```

**Suggestions** are hints only; the system never applies them automatically. Candidates are ranked:
1. `bill_reference` matches a bill's short number or customer name
2. an open bill whose `payable_amount` equals the IPN amount, with recent activity
3. a combination of the user's own open bills summing to the amount (small subset-sum, capped)

### 4.4 Real-time push

In `pg.subscriber.js`, handle `mpesa_transactions`:
- INSERT → `broadcast("mpesa:received", { id, amount, payerName, msisdnMasked, transactionAt }, { permissions: ["allocate_mpesa"] })`
- UPDATE (allocation) → `broadcast("mpesa:updated", …)` so the inbox on other tills removes or
  updates the item at once.

**PII:** broadcast and list a **masked** MSISDN (`2547****441`) plus first name. Only the
`manage_mpesa` detail view returns the full number (Kenya Data Protection Act).

### 4.5 POS UI (`pos/`)

1. **`mpesa.service.js` + `useMpesaTransactions` hook.** React Query lists unallocated transactions
   (last 24h by default). A socket listener invalidates the list on `mpesa:received` / `mpesa:updated`.
2. **M-Pesa inbox:** a badge with the unallocated count in the POS header, plus a panel that lists
   payer, masked phone, amount, time and receipt.
3. **Matching from the bill.** In `PaymentModal.jsx` **and** `beta/components/BetaPaymentModal.jsx`,
   choosing *M-Pesa* opens a picker of unallocated IPNs. Suggested ones are sorted first, and the
   amount auto-fills with `min(remaining on IPN, bill balance)`. Submitting calls `/allocate`.
   **Cash lines keep going through `/payments`.** A mixed cash + M-Pesa payment makes two calls:
   allocate first, then cash. Alternatively, add a combined endpoint later.
4. **Matching from the inbox (multi-bill).** Select an IPN, tick several open bills, and adjust the
   per-bill amounts. The UI shows the running remainder and submits one `/allocate` call. The
   transaction is atomic.
5. **Manual M-Pesa entry** (the current free-typed line). Keep it during rollout. Later, put it
   behind a setting `mpesa_require_ipn` so M-Pesa can only be paid via an IPN.

### 4.6 ERP (`erp/`)

- **M-Pesa Register** (under Financial Reports): all IPNs with filters for date, status and
  allocated-by, plus totals. Exportable.
- **Unallocated / exceptions view** for managers: ignore, reverse, and handle leftovers.
  Leftover handling is a business decision, see §6.
- Z-report: add an "M-Pesa via IPN vs manual" breakdown and an unallocated-at-close warning.
- Phase 3: bank reconciliation auto-match on `transactionID` = statement reference.

---

## 5. Delivery phases

| Phase | Scope | Exit criterion |
|---|---|---|
| **1. Receive** | Migration (tables, trigger, permissions); raw-body capture; signature verify; till webhook; idempotent insert; ack; audit; unit tests | Signed sample payloads stored. Duplicate → same id. Bad sig → code 1 |
| **2. UAT with KCB** | Deploy to a public HTTPS URL (e.g. `https://api.fairywren.co.ke/integrations/kcb/ipn/till`). Send KCB the URL and get their **public key** and **till/biller code**. They verify signature compliance in UAT | Real UAT notifications verified |
| **3. Match** | `allocate_mpesa_transaction`, reverse, ignore, suggestions, REST routes, socket events, POS inbox + PaymentModal picker | End-to-end: pay till → POS sees it live → match → bill completed + journal posted |
| **4. Back-office** | ERP register, exceptions, Z-report changes, `mpesa_require_ipn` setting | Managers can close the day with zero unexplained M-Pesa |
| **5. Later** | Account notifications, bank-rec auto-match | — |

### Tests (jest + supertest, already in the stack)
- `kcb.signature`: generate an RSA keypair in the test, sign a fixture, then check that verification
  passes, fails after one byte is changed, and fails with a missing header.
- Webhook: valid → 200/code 0 and row inserted. Replay → same `transactionId` and one row.
  Invalid sig → code 1 and no row. Bad amount → code 1. Route must not require auth and must not be
  rate-limited.
- Allocation (against a test DB):
  - 1→1 full payment
  - 1→N
  - N→1
  - over-allocation rejected
  - allocation to a voided/completed bill rejected
  - two concurrent allocations of the same IPN: exactly one wins
  - journal posted once
  - reverse restores the bill and the IPN balance
- A script `api/scripts/simulate-kcb-ipn.js` signs a fixture with a local test key and POSTs it, for
  local development.

### Config (`.env`)
```
KCB_IPN_PUBLIC_KEY_PATH=./keys/kcb_ipn_public.pem   # or KCB_IPN_PUBLIC_KEY (PEM, \n-escaped)
KCB_IPN_VERIFY_SIGNATURE=true                        # false allowed only when NODE_ENV!=production
KCB_TILL_BUSINESS_KEY=xxxxxx                         # reject/flag IPNs for other tills
KCB_IPN_ALLOWED_IPS=                                  # optional, comma-separated
```

---

## 6. Decisions (confirmed 2026-11-17)

| # | Decision | Effect on design |
|---|---|---|
| 1 | Matched payments are **confirmed immediately**, with no manager approval | `allocate_mpesa_transaction` inserts `status='confirmed'` payments. Manual M-Pesa lines keep the existing pending/approval flow |
| 2 | On overpayment, the **POS user chooses tip or deposit** | Allocation types `bill` / `tip` / `deposit` (§7) |
| 3 | A payment that doesn't match a bill exactly can be **part M-Pesa, part cash**. The user maps it to a bill | Partial allocation is allowed (amount ≤ bill payable). The cash remainder goes through `/payments`. No "ignore → suspense" flow |
| 4 | The KCB till settles into **1020 KCB Account** | Receipt journal debits 1020 |
| 5 | **Only till notifications** are live | `/account-notification` and `/validation` are out of scope |

Pending from KCB: the **public key** and **biller/till code** (forms submitted).

## 7. Accounting model (replaces the "journal on allocation" idea in §4.3)

The books match the bank from the moment KCB notifies us, using a clearing liability:

| Event | Journal | When |
|---|---|---|
| IPN received | Dr **1020 KCB Account** / Cr **2300 M-Pesa Unallocated Receipts** | Webhook (phase 1, built) |
| Mapped to a bill | Dr 2300 / Cr **1201 A/R Open Bills** | Allocation (phase 3) |
| Overpayment → tip | Dr 2300 / Cr **2200 Staff Tips Payable** (new liability; tips are owed to staff) | Allocation (phase 3) |
| Overpayment → deposit | No journal. The money stays in 2300, and the IPN remainder is labelled as a deposit (customer name / note) | Allocation (phase 3) |
| Deposit applied to a later bill | Dr 2300 / Cr 1201 (same as "mapped to a bill") | Allocation (phase 3) |
| Allocation reversed | Reverse of the allocation journal; the money returns to 2300 | Manager (phase 3) |

So the 2300 balance always equals unmatched IPNs plus open deposits, and the ERP can list exactly what
makes it up. Bank reconciliation of 1020 is unaffected by matching delays.

**Implementation note for phase 3:** IPN-funded `payments` rows must **not** go through
`post_payment_journal` (it debits 1020, which would count the money twice). The allocation function
writes its own `source_type='payment'` journal (Dr 2300 / Cr 1201) *before* anything else could call
`post_payment_journal`. Since that function skips payments that already have a journal, later calls
are no-ops.

## 8. Status

### Phase 1 — built (2026-11-17)

| File | What |
|---|---|
| `api/src/database/migrations/20261106_001_kcb_ipn.sql` | Account 2300, `mpesa_transactions`, `post_mpesa_receipt_journal()` |
| `api/src/modules/integrations/kcb.signature.js` | SHA256withRSA verification (raw body, falls back to re-serialised JSON); key from env |
| `api/src/modules/integrations/kcb.service.js` | Payload parsing, KCB ack format, idempotent store, receipt journal, audit |
| `api/src/modules/integrations/kcb.repository.js` / `kcb.controller.js` / `kcb.routes.js` / `kcb.docs.js` | Endpoint `POST /integrations/kcb/ipn/till` (public, own rate limit) |
| `api/src/utils/rawBody.js`, `app.js`, `load/routes.js`, `middleware/apiRateLimiter.js` | Raw-body capture, public mount, global-limiter exemption |
| `api/src/modules/integrations/__tests__/kcb.ipn.test.js` | 20 tests: signature, parsing, webhook behaviour |
| `api/scripts/simulate-kcb-ipn.js` | Generates dev keys and sends signed test notifications |

Response codes (to confirm with KCB in UAT): `200` + `"0"` stored or duplicate · `401` + `"1"` bad
or missing signature · `400` + `"1"` invalid payload · `500` + `"1"` temporary failure (KCB should retry).

**Env:** `KCB_IPN_PUBLIC_KEY_PATH` (or `KCB_IPN_PUBLIC_KEY`). With no key configured, every
notification is rejected. `KCB_IPN_VERIFY_SIGNATURE=false` works only outside production.

### Phase 3 — built (2026-11-17)

**Database** (`20261117_001_mpesa_allocations.sql`):
- Account **2200 Staff Tips Payable**.
- `mpesa_allocations` table (type `bill` / `tip`; a deposit is a label on the remaining amount of
  `mpesa_transactions`, with no journal).
- Permissions: `allocate_mpesa` for every role with `pos_access`, `manage_mpesa` for manager and
  owner. **Users must log in again** to pick these up.
- A slim notify trigger. It doesn't use the generic one, because full rows could exceed pg_notify's
  8000-byte limit and abort the allocation.
- `allocate_mpesa_transaction()`:
  - locks the transaction, then bills in id order
  - checks each line against `payable_amount`
  - creates confirmed payments with `mpesa_code`
  - journals Dr 2300 / Cr 1201, and Dr 2300 / Cr 2200 for tips
  - completes bills and updates the deposit label
- `reverse_mpesa_allocation()` voids the payment, mirrors the journal, reopens the bill, and puts
  the amount back on the transaction.

**API** (`modules/mpesa`):
- `GET /mpesa/transactions` (masked phone unless the user has `manage_mpesa`; `billId` ranks by match)
- `GET /mpesa/transactions/:id`
- `GET /mpesa/transactions/:id/suggestions`
- `POST /mpesa/transactions/:id/allocate`
- `POST /mpesa/allocations/:id/reverse`

Other API changes:
- Socket events `mpesa:received` and `mpesa:updated` go to the `perm:allocate_mpesa` room.
- **Voiding a bill with active M-Pesa allocations is blocked** (`BILL_HAS_MPESA_ALLOCATIONS`) until
  a manager reverses them.

**POS:**
- `MpesaPicker` in both payment modals: best match first; overpayment needs a Tip or Deposit choice.
- `submitBillPayments()` allocates notification lines first, then sends cash or manual lines
  through `/payments`.
- `MpesaInbox` header button with a badge: one payment to many bills, tip or deposit for the rest,
  and manager reversal with a reason. A live socket reload plus a 30 s poll as a fallback.

**Verification:**
- 18 service tests and a void-guard test.
- The POS production build passes.
- All PL/pgSQL bodies parsed with libpg-query. They couldn't be executed locally because
  plpgsql.dll is blocked on the dev machine, so **run both migrations on staging and smoke-test there.**

### Tip recipient (2026-11-18)

Migration `20261118_001_mpesa_tip_recipient.sql` adds `mpesa_allocations.tip_recipient_id`.
`allocate_mpesa_transaction` now **requires an active staff member** (`recipient_id`) on every tip
line, and the tip journal description names them.

The POS shows a type-to-search staff dropdown (`StaffCombobox`, fed by `GET /mpesa/staff`) wherever
**Tip** is chosen, in both payment modals and the inbox. The full allocate → tip → reverse flow was
tested against the local DB in a rolled-back transaction.

### Next
- Phase 2: deploy and register the callback URL with KCB once the key and biller code arrive.
  Check the logs for `signatureMatchedOn` (raw vs json).
- Customer payment instructions were changed to **Paybill 522533**, account 8040662 (2026-11-17), in
  the payment modal and both receipt layouts. Confirm with KCB that 8040662 is the Lipa na KCB till
  number customers should enter as the account.
### Phase 4 (ERP) — built (2026-11-18)

**Database** (`20261118_002_mpesa_tip_payouts.sql`):
- `mpesa_tip_payouts` table.
- `mpesa_tips_outstanding()` (accrued tips − payouts).
- `pay_mpesa_tips()` posts Dr 2200 / Cr a leaf, active cash or bank account. It refuses to pay more
  than is owed and uses an advisory lock per staff member.
- `reverse_mpesa_allocation()` now refuses to reverse a tip that has already been paid out
  (`MPESA_TIP_ALREADY_PAID_OUT`).

**API** (`manage_mpesa`):
- `GET /mpesa/register`: date range in EAT, with what each payment was matched to, and totals.
- `GET /mpesa/summary`: 2300 breakdown (unmatched + deposits − unjournaled) and 2200 owed per staff
  member, each compared with the ledger balance, plus the accounts tips can be paid from.
- `GET` and `POST /mpesa/tips/payouts`.
- The Z-report response gains an `mpesa` section: received, tips, deposits and unmatched for the
  day; IPN-matched vs typed M-Pesa on that day's bills; and items still open now.
- The `mpesa_require_ipn` setting makes `/payments` reject typed M-Pesa lines (`MPESA_IPN_REQUIRED`).

**ERP:**
- An **Accounting → M-Pesa** tab:
  - balance cards with a ledger check
  - Register: filters, CSV export, and payment detail with reversal
  - Unmatched & deposits, with age
  - Tips: amount owed per staff member, a payout dialog, and payout history
  - an owner-only switch for "Only accept matched M-Pesa"
- An M-Pesa section in the Z-report.
- The two new permissions are added to the role editor.

**POS:** when the setting is on, the typed M-Pesa input is hidden and only the picker is offered.

**Verification:** migrations and services were run against the local DB in a rolled-back
transaction. Payout limits, account validation, the paid-tip reversal guard, and both ledger checks
(difference 0) all behaved as expected. The ERP and POS builds pass.

### Dedicated menu (2026-11-18)

M-Pesa moved out of the Accounting tabs into its own sidebar entry, **Finance → M-Pesa Payments**
(`/mpesa`). It has its own mobile bottom nav.

The default **Payments** view has:
- period presets (Today, Yesterday, This week, This month, Last month, Custom)
- six summary cards (received, applied to bills, tips, deposits, unmatched, average)
- a search box: M-Pesa code, any part of the payer's name, or mobile number. The API normalises
  `0712…`, `712…` and `+254712…` to the stored `2547…` form.
- the payments table, with CSV export

The current-position cards and ledger check are shown on the *Unmatched & deposits* and *Tips* views.

### Still open
- Phase 5: bank reconciliation auto-match on `transactionID`.
- Optional: pre-fill the tip recipient with the bill's waiter.

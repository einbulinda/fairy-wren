# Subscription & Monetization — Implementation Plan

**Project:** Fairy Wren Nightclub Management System  
**Scope:** POS, ERP (Web app is public-facing, no gating needed)  
**Date:** April 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Multi-Tenancy](#2-phase-1--multi-tenancy)
3. [Phase 2 — Subscription Data Model](#3-phase-2--subscription-data-model)
4. [Phase 3 — Enforcement Middleware](#4-phase-3--enforcement-middleware)
5. [Phase 4 — Frontend Enforcement](#5-phase-4--frontend-enforcement)
6. [Phase 5 — Payment Processing](#6-phase-5--payment-processing)
7. [Phase 6 — Subscriptions API Module](#7-phase-6--subscriptions-api-module)
8. [Phase 7 — Trial Period](#8-phase-7--trial-period)
9. [Phase 8 — Renewal Reminders](#9-phase-8--renewal-reminders)
10. [Implementation Sequence](#10-implementation-sequence)
11. [Key Design Decisions](#11-key-design-decisions)

---

## 1. Architecture Overview

Two problems must be solved together:

1. **Multi-tenancy** — The system is currently single-tenant (one nightclub). Selling to multiple venues requires every piece of data to be scoped to a **tenant** (a venue/business).
2. **Subscription enforcement** — Each tenant's access to POS and/or ERP is gated by an active subscription. Expired or unsubscribed tenants are redirected to a subscription page.

The enforcement boundary is the **API**. Frontends redirect on `402` responses — they are never the sole gate because they can be bypassed.

---

## 2. Phase 1 — Multi-Tenancy

### 2.1 New table: `tenants`

```sql
CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,  -- e.g. "fairy-wren" (used in subdomain)
  email       text NOT NULL,         -- primary billing contact
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### 2.2 Add `tenant_id` to all existing tables

Every table (bills, products, categories, users/profiles, payments, inventory, etc.) gets:

```sql
ALTER TABLE <table> ADD COLUMN tenant_id uuid REFERENCES tenants(id);
```

Migration files handle this per table. Existing data is assigned to a seed tenant representing the current Fairy Wren installation.

### 2.3 Row Level Security (RLS)

In Supabase, enable RLS on every tenant-scoped table and add a policy:

```sql
-- Example for bills table
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON bills
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

The API sets `app.tenant_id` at the start of every request so all queries are automatically scoped — no per-query `WHERE tenant_id = ?` needed.

### 2.4 `resolveTenant` middleware

```js
// api/src/middleware/tenant.middleware.js
const resolveTenant = async (req, res, next) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(401).json({ success: false, message: 'No tenant context' });

  // Set Postgres session variable for RLS
  await supabase.rpc('set_config', { key: 'app.tenant_id', value: tenantId });
  req.tenant = { id: tenantId };
  next();
};
```

Applied after `auth.middleware` on all protected routes.

### 2.5 Tenant signup flow

A separate **signup/onboarding** endpoint (public, not under RBAC) creates a new tenant + owner user + trial subscription in a single transaction:

```
POST /auth/register-tenant
  { business_name, slug, email, password }
```

---

## 3. Phase 2 — Subscription Data Model

### 3.1 Tables

```sql
CREATE TYPE subscription_plan   AS ENUM ('pos', 'erp', 'full');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'grace', 'expired', 'cancelled');

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id),
  plan                  subscription_plan   NOT NULL DEFAULT 'full',
  status                subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at         timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,   -- the hard expiry date
  cancelled_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id),
  amount          numeric(12,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'KES',
  payment_method  text NOT NULL,          -- 'mpesa', 'card', 'bank_transfer'
  payment_ref     text,                   -- M-Pesa transaction code / gateway ref
  status          text NOT NULL DEFAULT 'pending',  -- pending | confirmed | failed
  period_start    timestamptz,
  period_end      timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 3.2 Plans and pricing

| Plan | Covers | Notes |
|------|--------|-------|
| `pos` | POS app only | Suitable for venues that manage ERP elsewhere |
| `erp` | ERP app only | Rarely used standalone |
| `full` | POS + ERP | Bundled — recommended; priced at a discount vs. separate |

Actual prices are stored in a `subscription_plans` config table (not hardcoded) so they can be updated without a deployment.

### 3.3 Status lifecycle

```
[new tenant] ──► trialing ──► active ──► grace ──► expired
                                  └──────────────────────► cancelled
```

| Transition | Trigger |
|-----------|---------|
| `trialing` → `active` | First successful payment |
| `active` → `grace` | Cron job: day after `current_period_end` |
| `grace` → `expired` | Cron job: 14 days after `current_period_end` |
| Any → `cancelled` | Tenant requests cancellation (effective at period end) |
| `expired/cancelled` → `active` | New payment received |

---

## 4. Phase 3 — Enforcement Middleware

### 4.1 `checkSubscription` middleware

```js
// api/src/middleware/subscription.middleware.js
const checkSubscription = (app) => async (req, res, next) => {
  const tenantId = req.user.tenant_id;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, trial_ends_at')
    .eq('tenant_id', tenantId)
    .single();

  // No subscription at all
  if (!sub) {
    return res.status(402).json({
      success: false,
      error: { code: 'NO_SUBSCRIPTION', app }
    });
  }

  // Hard expired or cancelled
  if (sub.status === 'expired' || sub.status === 'cancelled') {
    return res.status(402).json({
      success: false,
      error: { code: 'SUBSCRIPTION_EXPIRED', app, expired_at: sub.current_period_end }
    });
  }

  // Check plan covers requested app
  const planCovers = sub.plan === 'full' || sub.plan === app;
  if (!planCovers) {
    return res.status(402).json({
      success: false,
      error: { code: 'PLAN_NOT_SUBSCRIBED', app, current_plan: sub.plan }
    });
  }

  // Attach subscription context for controllers that need it
  req.subscription = sub;
  next();
};

module.exports = { checkSubscription };
```

### 4.2 Applying to routes

```js
// In server.js / route registration
const { checkSubscription } = require('./middleware/subscription.middleware');

// All ERP routes
app.use('/api/reports',    authenticate, checkSubscription('erp'), reportsRouter);
app.use('/api/journals',   authenticate, checkSubscription('erp'), journalsRouter);
app.use('/api/payroll',    authenticate, checkSubscription('erp'), payrollRouter);
// ... all other ERP modules

// All POS routes
app.use('/api/bills',      authenticate, checkSubscription('pos'), billsRouter);
app.use('/api/payments',   authenticate, checkSubscription('pos'), paymentsRouter);
// ... all other POS modules

// Shared routes (both apps need them)
app.use('/api/products',   authenticate, checkSubscription('pos'), productsRouter);
app.use('/api/categories', authenticate, checkSubscription('pos'), categoriesRouter);
```

### 4.3 JWT subscription claims

Include subscription data in the JWT at login time to avoid a DB hit on most requests. Use the middleware as a fallback for sensitive operations only.

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "manager",
  "subscription": {
    "plan": "full",
    "status": "active",
    "expires_at": "2027-04-14T00:00:00Z"
  }
}
```

Re-issue the JWT after any subscription change (renewal, upgrade, cancellation).

---

## 5. Phase 4 — Frontend Enforcement

### 5.1 Axios interceptor (identical in both POS and ERP)

Add to the shared Axios instance setup file:

```js
// src/lib/axios.js (or equivalent)
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 402) {
      const code = error.response.data?.error?.code;
      const params = new URLSearchParams({ reason: code });
      window.location.href = `/subscribe?${params}`;
    }
    return Promise.reject(error);
  }
);
```

### 5.2 `/subscribe` page

A standalone React page served by both POS and ERP at their own `/subscribe` route. Does not require a valid subscription to render — only a valid JWT to identify the tenant.

Sections:
1. **Status banner** — "Your subscription expired on [date]" or "You are on a free trial — X days remaining"
2. **Plan cards** — POS / ERP / Full Suite with annual prices and feature lists
3. **Payment button** — triggers M-Pesa STK Push or card payment flow
4. **Payment history** — list of past payments

### 5.3 In-app renewal banner

When `subscription.expires_at` is within 30 days, show a dismissible warning bar at the top of the app:

```
⚠  Your subscription expires in 14 days.  [Renew Now]
```

During the 14-day grace period, change the banner to an error tone:

```
🔴  Your subscription has expired. Access will be locked in X days.  [Renew Now]
```

---

## 6. Phase 5 — Payment Processing

### 6.1 Recommended gateway: Flutterwave

Supports M-Pesa, card (Visa/Mastercard), Equity bank, and KCB under one API. Has a clean webhook system and supports recurring payment references.

Alternative: **Pesapal** — more established in Kenya, supports more local banks, but the developer API is less ergonomic.

### 6.2 Payment flow

```
1.  Tenant selects plan on /subscribe
2.  POST /api/subscriptions/initiate  { plan, payment_method }
3.  API creates subscription_payment record (status: pending)
4.  API calls Flutterwave to initiate payment
    - M-Pesa: STK Push sent to tenant's phone
    - Card: Returns a hosted payment link
5.  Customer approves on phone / completes card form
6.  Flutterwave fires webhook → POST /api/subscriptions/webhook
7.  API verifies webhook HMAC signature
8.  API sets subscription status = 'active'
    current_period_start = now()
    current_period_end   = now() + 1 year
9.  API re-issues JWT with updated subscription claims
10. Frontend receives new token, redirects to dashboard
```

### 6.3 Webhook security

```js
// Verify Flutterwave webhook signature
const crypto = require('crypto');
const hash = crypto
  .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_HASH)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (hash !== req.headers['verif-hash']) {
  return res.status(401).json({ message: 'Invalid signature' });
}
```

### 6.4 Environment variables to add

```env
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_SECRET_HASH=<webhook-secret>
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
```

---

## 7. Phase 6 — Subscriptions API Module

New module: `api/src/modules/subscriptions/`

| File | Purpose |
|------|---------|
| `subscriptions.controller.js` | Request handlers |
| `subscriptions.service.js` | Business logic, plan transitions |
| `subscriptions.repository.js` | DB reads/writes |
| `subscriptions.routes.js` | Route definitions |
| `subscriptions.webhook.js` | Webhook handler (separate, public route) |

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/subscriptions/current` | JWT | Current plan, status, expiry |
| `POST` | `/subscriptions/initiate` | JWT | Start new subscription or renewal |
| `POST` | `/subscriptions/webhook` | None (signature) | Receive gateway events |
| `GET` | `/subscriptions/history` | JWT | Past payments |
| `POST` | `/subscriptions/cancel` | JWT + owner role | Cancel at period end |
| `GET` | `/subscriptions/plans` | None | Public pricing config |

### ERP Admin — Billing page

Add an **Admin → Billing** section to the ERP so owners can manage their subscription without leaving the app:
- Current plan and status
- Next renewal date
- Pay now / upgrade buttons
- Invoice/payment history with PDF download

---

## 8. Phase 7 — Trial Period

Every new tenant automatically receives a 14-day full trial on signup:

```js
// In auth.service.js tenant registration
await supabase.from('subscriptions').insert({
  tenant_id: newTenant.id,
  plan: 'full',
  status: 'trialing',
  trial_ends_at: addDays(new Date(), 14),
  current_period_end: addDays(new Date(), 14),
});
```

Trial tenants have full access to both POS and ERP. The `checkSubscription` middleware allows `trialing` status through as long as `trial_ends_at` has not passed.

---

## 9. Phase 8 — Renewal Reminders

Extend the existing `node-cron` scheduler in `api/src/modules/inventory/services/inventory.scheduler.js` or create a dedicated `subscriptions.scheduler.js`:

| Days before expiry | Action |
|-------------------|--------|
| 30 days | Email + SMS to tenant admin: "Renew before [date]" |
| 14 days | Second reminder with invoice preview |
| 7 days | Final reminder + in-app banner activates |
| 0 (expiry day) | Status → `grace`; in-app banner upgrades to error tone |
| +14 days (grace end) | Status → `expired`; all API calls return 402 |

**SMS provider for Kenya:** Africa's Talking (AfricasTalking SDK) — supports Kenyan sender IDs and bulk SMS.

```env
AFRICASTALKING_API_KEY=...
AFRICASTALKING_USERNAME=...
AFRICASTALKING_SENDER_ID=FairyWren
```

---

## 10. Implementation Sequence

### Step 1 — Database (migrations)
- [ ] Create `tenants` table
- [ ] Create `subscriptions` and `subscription_payments` tables
- [ ] Add `tenant_id` column to all existing tables (one migration per table or grouped)
- [ ] Seed a default tenant for the existing Fairy Wren installation
- [ ] Write and test RLS policies in Supabase

### Step 2 — API core
- [ ] `resolveTenant` middleware
- [ ] `checkSubscription(app)` middleware
- [ ] Update `auth.service.js` to include subscription claims in JWT
- [ ] Update `auth.service.js` tenant registration to create trial subscription
- [ ] Apply `checkSubscription` to all POS and ERP route groups in `server.js`

### Step 3 — Subscriptions module
- [ ] `subscriptions.repository.js` — CRUD
- [ ] `subscriptions.service.js` — plan transitions, renewal logic
- [ ] `subscriptions.webhook.js` — Flutterwave webhook handler with HMAC verification
- [ ] `subscriptions.controller.js` + `subscriptions.routes.js`
- [ ] Cron job for status transitions (grace/expired) and reminder dispatch

### Step 4 — Payment gateway
- [ ] Create Flutterwave account, configure webhook URL
- [ ] Implement `/subscriptions/initiate` (STK Push + card link)
- [ ] Implement `/subscriptions/webhook` with signature verification
- [ ] Test full payment → subscription activation flow

### Step 5 — POS frontend
- [ ] Add 402 interceptor to Axios instance
- [ ] Build `/subscribe` page (plan cards, payment trigger, history)
- [ ] In-app renewal banner component (30-day warning, grace-period error)

### Step 6 — ERP frontend
- [ ] Add 402 interceptor to Axios instance (same pattern as POS)
- [ ] Build `/subscribe` page
- [ ] In-app renewal banner
- [ ] Admin → Billing section with plan management and payment history

### Step 7 — Onboarding
- [ ] Public `POST /auth/register-tenant` endpoint
- [ ] Tenant signup UI (can be a standalone page or part of the Web app)

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enforcement location | API middleware only | Frontend checks can be bypassed; API is the real gate |
| Subscription in JWT | Yes | Avoids DB hit on every request; re-issued on any status change |
| Grace period | 14 days | Industry standard; prevents hard lockout due to billing delays |
| Trial | 14 days, full plan | Gives prospects full experience of both apps before paying |
| Payment gateway | Flutterwave | Best M-Pesa + card + webhook support for the Kenyan market |
| Billing UI | Inside ERP Admin | Self-service renewals reduce support overhead |
| Multi-tenancy isolation | Supabase RLS | Enforced at DB level; no risk of cross-tenant data leaks |
| Pricing config | Database table | Prices can change without a code deployment |

---

*Created: April 2026*

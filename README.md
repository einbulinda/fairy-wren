# Fairy Wren — Nightclub Management System

A full-stack monorepo for managing all aspects of Fairy Wren Nightclub operations — from the bar to the back office to the public website.

## Repository Structure

```
fairy-wren/
├── api/        — Express.js REST API + WebSocket server
├── pos/        — Point-of-Sale frontend (React, staff-facing)
├── erp/        — Enterprise Resource Planning frontend (React, management-facing)
├── web/        — Public website (React, customer-facing)
└── plans/      — Architecture and implementation documentation
```

## Quick Start

Install dependencies for all sub-projects first, then use the root-level scripts:

```bash
# Install all dependencies
npm install && cd api && npm install && cd ../pos && npm install && cd ../erp && npm install && cd ../web && npm install && cd ..

# Development — run everything at once
npm run dev

# Or run individual sub-projects
npm run dev:api     # API server only
npm run dev:pos     # API + POS
npm run dev:erp     # API + ERP
npm run dev:web     # API + Web
```

## Deployment Targets

| App | Domain | Port (dev) |
|-----|--------|------------|
| API | (shared backend) | 8000 |
| POS | pos.fairywren.co.ke | 5173 |
| ERP | erp.fairywren.co.ke | 5174 |
| Web | fairywren.co.ke | 5175 |

---

## API (`/api`)

The central backend serving all three frontends. Built on Node.js with Express.js v5.

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | Express.js v5 |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io + Supabase subscriptions |
| Logging | Winston + Pino |
| Background jobs | node-cron |
| API docs | Swagger / OpenAPI |
| Testing | Jest |

### Architecture

Routes are split into **public** (unauthenticated) and **protected** (JWT + RBAC) groups. Protected modules follow a **Controller → Service → Repository** pattern. All database access goes through the Supabase client; complex queries use PostgreSQL RPC functions (`callRpc`).

```
api/src/
├── modules/           — Feature modules (auth, bills, products, …)
│   └── <module>/
│       ├── <module>.controller.js
│       ├── <module>.service.js
│       └── <module>.repository.js
├── middleware/        — Auth, RBAC, rate-limiting, error handling
├── database/
│   ├── migrations/    — SQL migration files (YYYYMMDD_NNN_description.sql)
│   └── migrate.js     — Migration runner
├── websocket/         — Socket.io server + Supabase real-time subscriber
└── server.js          — Entry point
```

### API Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **auth** | `/auth` | Login, logout, PIN auth, session management |
| **bills** | `/bills` | Bill creation, modification, status management |
| **payments** | `/payments` | Payment processing and confirmation |
| **products** | `/products` | Product catalog, pricing |
| **categories** | `/categories` | Product category management |
| **inventory** | `/inventory` | Stock levels, stock takes, adjustments |
| **reports** | `/reports` | Dashboard metrics, Z-reports, financial reports |
| **expenses** | `/expenses` | Expense recording and categorisation |
| **suppliers** | `/suppliers` | Supplier/vendor management |
| **accounts** | `/accounts` | Chart of accounts |
| **journals** | `/journals` | Accounting journal entries |
| **cheques** | `/cheques` | Cheque writing and management |
| **payroll** | `/payroll` | Employee payroll processing |
| **bank-reconciliation** | `/bank-reconciliation` | Bank statement reconciliation |
| **targets** | `/targets` | Performance target management |
| **users** | `/users` | User accounts and role assignment |
| **roles** | `/roles` | Role and permission management |
| **settings** | `/settings` | System configuration |
| **events** | `/events` | Public-facing event listings |
| **gallery** | `/gallery` | Public-facing photo gallery |
| **reservations** | `/reservations` | Public-facing booking requests |
| **feedback** | `/feedback` | Customer feedback submission |

### Database Migrations

Migrations are plain SQL files tracked in the `_migrations` table:

```bash
cd api
npm run migrate           # apply pending migrations
npm run migrate:status    # list applied / pending
```

Files follow the naming convention `YYYYMMDD_NNN_description.sql` and are applied once in alphabetical order. To re-run a function change, create a new migration file.

### Environment Variables

Create `api/.env`:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<service-role-key>
JWT_SECRET=<minimum-32-chars-in-production>
PIN_PEPPER=<minimum-16-chars-in-production>
PORT=8000                  # optional, default 8000
NODE_ENV=development       # optional
```

### Scripts

```bash
npm run start           # production start
npm run dev             # nodemon (auto-reload)
npm run migrate         # apply pending migrations
npm run migrate:status  # migration status
npm run test            # Jest tests
```

---

## POS (`/pos`)

The staff-facing point-of-sale terminal. Designed for bartenders and floor staff at the venue.

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Server state | Axios (custom hooks) |
| Real-time | Socket.io-client |
| Notifications | react-hot-toast |
| Icons | lucide-react |

### Key Features

- **Bill management** — Create, modify, split, and close bills in real time
- **Product selection** — Category-based product grid with search
- **Payment processing** — Cash, M-Pesa, card, cheque, partial and multi-mode payments
- **Open bills** — View and resume any open bill across the venue
- **Stock take** — Physical inventory entry and approval workflow
- **Z-Report** — End-of-day sales reconciliation with payment breakdown, outstanding bills movement, and drill-down modals
- **Weekly sales view** — Sales analytics by week and day
- **Real-time sync** — Live bill and inventory updates via WebSocket
- **Beta UI** — Alternate dark UI toggle available per user preference

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Staff authentication |
| POS | `/` | Main order and payment screen |
| Stock Take | `/stock-take` | Physical inventory entry |
| Weekly Sales | `/weekly-sales` | Sales analytics |
| Z-Report | `/z-report` | Daily reconciliation |

### Environment Variables

Create `pos/.env`:

```env
VITE_SERVER_URL=http://localhost:8000
```

### Scripts

```bash
npm run dev       # Vite dev server (port 5173)
npm run build     # production build
npm run preview   # preview production build
npm run lint      # ESLint
```

---

## ERP (`/erp`)

The management-facing enterprise resource planning system. Used by managers, accountants, HR, and inventory staff.

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| State | React Context + Zustand |
| Server state | TanStack React Query |
| Tables | TanStack React Table |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Export | jsPDF + jspdf-autotable, XLSX |
| Real-time | Socket.io-client |
| Icons | lucide-react |

### Key Features

- **Dashboard** — KPI cards, sales trend charts, cash flow widget, staff performance, inventory alerts, outstanding bills summary
- **Sales & Bills** — View and manage all bills, payment status, daily/weekly breakdown
- **Financial reports** — Balance sheet, income statement, cash flow statement, trial balance
- **Accounting** — Chart of accounts, journal entries, general ledger, bank reconciliation
- **Inventory** — Purchase receipts, stock levels, WAC cost price tracking, reorder forecasting
- **Payroll** — Employee payroll processing and records
- **Cheque writing** — Cheque management with bank account allocation
- **Suppliers** — Supplier records, purchase history, accounts payable
- **Z-Report** — End-of-day report with hourly breakdown, payment analysis, outstanding bills movement and drill-down
- **Web Hub** — Manage public website content (events, gallery, reservations, feedback)
- **Admin** — User management, role permissions, system settings, business targets

### Pages

| Section | Description |
|---------|-------------|
| Dashboard | KPIs, trends, alerts |
| Sales | Bills, payments, Z-Report, weekly sales |
| Financial Reports | Balance sheet, P&L, cash flow, trial balance |
| Accounting | Chart of accounts, journals, ledger, bank reconciliation |
| Inventory | Stock receipts, stock levels, reorder alerts |
| Products | Product catalog with cost and pricing |
| Purchasing | Supplier purchases and payables |
| Suppliers | Supplier management |
| Payroll | Employee payroll |
| Cheques | Cheque writing and tracking |
| Web Hub | Public website content management |
| Admin | Users, roles, settings, targets |

### Environment Variables

Create `erp/.env`:

```env
VITE_SERVER_URL=http://localhost:8000
```

### Scripts

```bash
npm run dev       # Vite dev server (port 5174)
npm run build     # production build
npm run preview   # preview production build
npm run lint      # ESLint
```

---

## Web (`/web`)

The public-facing marketing website for Fairy Wren Nightclub.

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v3 |
| HTTP | Axios |

### Key Features

- Venue information and branding
- Upcoming events listing (pulled from API)
- Photo gallery (pulled from API)
- Online table/event reservation form
- Customer feedback submission
- WhatsApp contact button
- Fully static-friendly — most content is fetched from the API at runtime

### Sections

| Component | Description |
|-----------|-------------|
| Navbar | Responsive navigation |
| Hero | Full-screen landing banner |
| About | Venue story and info |
| Events | Upcoming events from API |
| Gallery | Photo gallery from API |
| Testimonials | Customer reviews |
| Reservation | Booking request form |
| Contact | Location, hours, contact details |
| Footer | Links and social media |

### Environment Variables

Create `web/.env`:

```env
VITE_SERVER_URL=http://localhost:8000
```

### Scripts

```bash
npm run dev       # Vite dev server (port 5175)
npm run build     # production build
npm run preview   # preview production build
```

---

## Authentication & Security

- All API endpoints (except `/auth` and `/public`) require a valid **JWT Bearer token**
- Tokens are issued on login and verified by middleware on every protected request
- **Role-based access control (RBAC)** — permissions are checked per route and per action
- PIN authentication is supported for quick re-authentication at the POS
- Passwords are hashed with bcryptjs; PINs use an additional server-side pepper
- Rate limiting is applied globally and tightened on auth endpoints
- Helmet sets security headers; CORS is restricted to the three production domains

## Real-time Updates

The API runs a **Socket.io** server alongside Express. Clients authenticate their WebSocket connection with the same JWT. The server also subscribes to **Supabase real-time** channels and relays database change events to connected clients — ensuring that bills, stock levels, and payments reflect live state across all open sessions.

## Contributing

1. Branch from `main`
2. Apply database changes as a new migration file in `api/src/database/migrations/`
3. Run `npm run migrate` to apply before testing
4. Keep API, POS, ERP, and Web changes in a single PR when they are coupled

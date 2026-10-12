# RouteFlow

**RouteFlow** is a full-stack freight logistics platform that connects manufacturers with logistics companies across Nepal. Manufacturers post shipment orders, logistics companies place competitive bids, and the manufacturer selects the best offer to confirm the job.

Live: **https://route-flow-xi.vercel.app**

---

## Overview

**Problem it solves:** Freight coordination in Nepal is fragmented and manual. RouteFlow digitises the full cycle — from order posting to delivery confirmation — with real-time communication and integrated payment.

**Key features:**
- **Role-based dashboards** — separate views for Manufacturers, Logistics Companies, and Admins
- **Order lifecycle** — draft → published → bidding → confirmed → in-transit → delivered
- **Bidding system** — logistics companies submit price offers; manufacturers accept one to confirm
- **Real-time chat** — Socket.io-powered messaging per order with file attachment support
- **Real-time notifications** — live alerts for bids, order updates, and messages
- **Route visualisation** — interactive Mapbox maps with geocoding restricted to Nepal
- **Payments** — Khalti and eSewa sandbox integrations with full payment history
- **Admin panel** — user verification, company document review, support ticket management
- **Internationalisation** — English and Nepali (react-i18next)
- **Help & Support** — ticketing system with admin reply

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 18 | |
| pnpm | 8 | `npm install -g pnpm` |
| Mapbox account | — | free tier; for map token |
| Khalti developer account | — | sandbox credentials |
| eSewa developer account | — | sandbox credentials (default code: `EPAYTEST`) |
| Gmail account | — | App Password for transactional email |

> **Database:** RouteFlow uses **SQLite** via `better-sqlite3`. No external database server is required — the database file is created automatically at `backend/data/routeflow.db` on first run.

---

## Installation

```bash
# Clone
git clone git@github.com:Abhimannu09dev/RouteFlow.git
cd RouteFlow

# Backend
cd backend
cp "env sample" .env
# Fill in .env — see Configuration below
pnpm install
pnpm run dev

# Frontend (new terminal)
cd ../frontend
cp "env sample" .env.local
# Fill in .env.local — see Configuration below
pnpm install
pnpm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

---

## Configuration

### Backend — `backend/.env`

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP port | `5000` | No |
| `NODE_ENV` | `development` or `production` | `development` | No |
| `JWT_SECRET` | Long random string for signing tokens — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | — | **Yes** |
| `FRONTEND_URL` | Exact frontend origin (no trailing slash) | `http://localhost:3000` | **Yes** |
| `DB_PATH` | Path to the SQLite database file | `./data/routeflow.db` | No |
| `SMTP_HOST` | SMTP host | `smtp.gmail.com` | **Yes** |
| `SMTP_PORT` | SMTP port | `587` | No |
| `SMTP_USER` | Gmail address for sending OTPs and resets | — | **Yes** |
| `SMTP_PASS` | Gmail [App Password](https://myaccount.google.com/apppasswords) (not your account password) | — | **Yes** |
| `SMTP_FROM` | Sender display name and address | — | **Yes** |
| `KHALTI_SECRET_KEY` | Sandbox secret key from [test-admin.khalti.com](https://test-admin.khalti.com) | — | **Yes** |
| `ESEWA_MERCHANT_CODE` | eSewa sandbox merchant code | `EPAYTEST` | No |
| `ESEWA_SECRET_KEY` | eSewa sandbox secret key | — | **Yes** |
| `BASE_URL` | Public URL of the backend (used to keep Render free-tier awake) | — | Production only |

> Gmail requires **two-factor authentication** to generate an App Password.

### Frontend — `frontend/.env.local`

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend URL (no trailing slash) | `http://localhost:5000` | **Yes** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public token from [account.mapbox.com](https://account.mapbox.com) (starts with `pk.`) | — | **Yes** |

---

## Usage

### Roles

| Role | What they can do |
|------|-----------------|
| **Manufacturer** | Create and manage shipment orders, review bids, confirm logistics partners, chat, pay |
| **Logistics** | Browse available orders, submit price bids, view confirmed jobs, chat, receive payment |
| **Admin** | Verify logistics company registrations, manage users, handle support tickets |

### Seed data

Populate the database with realistic test data using [Faker.js](https://fakerjs.dev/):

```bash
cd backend
pnpm tsx seed.ts
```

All seeded accounts use the password: **`Password@123`**

---

## Project Structure

```
RouteFlow/
├── frontend/          # Next.js 16 app (App Router)
│   ├── app/
│   │   ├── (public)/  # Landing, auth, password reset
│   │   └── (protected)/
│   │       ├── manufacturer/
│   │       ├── logistics/
│   │       └── admin/
│   ├── components/    # Shared and role-specific UI
│   ├── contexts/      # ThemeContext
│   ├── hooks/         # useAuth
│   ├── lib/           # api.ts, fetchAPI.ts, i18n.ts
│   └── public/locales/ # en.json, ne.json
├── backend/           # Express.js v5 API
│   ├── index.ts       # Entry point
│   ├── db/            # SQLite setup and schema (better-sqlite3)
│   ├── controllers/   # Business logic per domain
│   ├── routes/        # Express routers
│   ├── middleware/     # auth (JWT), upload (Multer)
│   ├── models/        # Data-access layer
│   ├── websocket/     # Socket.io handlers
│   ├── utils/         # Nodemailer mailer
│   ├── validators/    # Zod schemas
│   ├── seed.ts        # Faker.js seed script
│   └── data/          # SQLite database file (auto-created, git-ignored)
└── README.md
```

See [`frontend/README.md`](./frontend/README.md) and [`backend/README.md`](./backend/README.md) for per-service details.

---

## Development

### Backend

```bash
cd backend
pnpm run dev          # tsx watch — hot reload
pnpm run typecheck    # TypeScript type-check without emit
pnpm run lint         # ESLint
pnpm run test         # Vitest (single run)
pnpm run test:watch   # Vitest watch mode
pnpm run test:coverage
pnpm run build        # Compile to dist/
pnpm run start        # Run compiled dist/index.js
```

### Frontend

```bash
cd frontend
pnpm run dev          # Next.js dev server
pnpm run build        # Production build
pnpm run start        # Serve production build locally
pnpm run lint         # ESLint
```

---

## Deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN` in project env vars |
| Backend | [Render](https://render.com) | Set all backend env vars; free tier cold-starts are mitigated by the built-in self-ping |

**CORS:** `FRONTEND_URL` must exactly match the frontend origin (protocol, domain, no trailing slash).

**Cookies:** In production (`NODE_ENV=production`) the JWT cookie is `secure: true` and `sameSite: "none"` for cross-origin support.

---

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss significant changes.

---

## License

This project is licensed under the **[MIT License](./LICENSE)**.

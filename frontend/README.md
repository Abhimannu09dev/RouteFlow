# RouteFlow — Frontend

The RouteFlow frontend is a Next.js 16 application using the App Router with TypeScript and Tailwind CSS v4. It provides role-specific dashboards for manufacturers, logistics companies, and administrators, with real-time features powered by Socket.io.

---

## Tech Stack

- **Next.js 16** — App Router, server + client components
- **TypeScript**
- **Tailwind CSS v4**
- **Ant Design** — UI component library
- **Mapbox GL JS** + **Mapbox Geocoder** — interactive route maps
- **socket.io-client** — real-time notifications and chat
- **react-i18next** — English / Nepali internationalization
- **react-toastify** — toast notifications
- **lucide-react** — icons
- **date-fns** — date formatting

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/routeflow.git
cd routeflow/frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your values. See [Environment Variables](#environment-variables) below.

### 3. Run the development server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

> Make sure the backend server is also running at `http://localhost:5000` (or update `NEXT_PUBLIC_API_URL` accordingly).

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# ───────────────────────────────────────────
# API
# ───────────────────────────────────────────
# URL of the running backend server (no trailing slash)
# Development: http://localhost:5000
# Production:  https://your-render-service.onrender.com
NEXT_PUBLIC_API_URL=http://localhost:5000

# ───────────────────────────────────────────
# Mapbox
# ───────────────────────────────────────────
# Public token from https://account.mapbox.com
# Required for the route picker and map display components
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```

> **Getting a Mapbox token:**
> 1. Create a free account at [mapbox.com](https://account.mapbox.com)
> 2. Go to **Account → Tokens**
> 3. Copy your **Default public token** or create a new one
> 4. The geocoder is restricted to Nepal's bounding box by default

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── (public)/
│   │   ├── page.tsx                        # Landing page
│   │   └── auth/
│   │       ├── page.tsx                    # Login / Register
│   │       ├── verify-otp/page.tsx
│   │       ├── forgot-password/page.tsx
│   │       ├── check-inbox/page.tsx
│   │       └── create-password/page.tsx
│   └── (protected)/
│       ├── manufacturer/
│       │   ├── layout.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── order-management/
│       │   │   ├── page.tsx
│       │   │   ├── [orderId]/page.tsx
│       │   │   └── order-placement-form/page.tsx
│       │   ├── bids/page.tsx
│       │   ├── history/page.tsx
│       │   ├── chats/page.tsx
│       │   ├── payments/page.tsx
│       │   ├── profile/page.tsx
│       │   ├── settings/page.tsx
│       │   └── support/page.tsx
│       ├── logistics/
│       │   ├── layout.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── orders-placement/
│       │   │   ├── page.tsx
│       │   │   └── [orderId]/page.tsx
│       │   ├── bids/page.tsx
│       │   ├── history/
│       │   │   ├── page.tsx
│       │   │   └── [orderId]/page.tsx
│       │   ├── chats/page.tsx
│       │   ├── payments/page.tsx
│       │   ├── profile/page.tsx
│       │   ├── settings/page.tsx
│       │   └── support/page.tsx
│       └── admin/
│           ├── layout.tsx
│           ├── dashboard/page.tsx
│           ├── users/page.tsx
│           └── support/page.tsx
├── components/
│   ├── auth/
│   ├── admin/
│   ├── manufaturer/                # Note: intentional folder name — do not rename
│   ├── logistics/
│   └── shared/
│       ├── pagination.tsx          # Shared pagination component
│       ├── chat/
│       ├── payment/
│       ├── settings/
│       └── support/
├── configs/
│   └── env.config.ts
├── contexts/
│   └── ThemeContext.tsx
├── hooks/
│   └── useAuth.ts
├── lib/
│   ├── api.ts                      # All API calls + pagination types/helpers
│   ├── fetchAPI.ts
│   └── i18n.ts
└── public/
    ├── locales/
    │   ├── en.json                 # English translations
    │   └── ne.json                 # Nepali translations
    └── ...
```

---

## Roles & Access

| Role | Access |
|---|---|
| **Manufacturer** | Create and manage shipment orders, review bids, confirm logistics partners, chat, payments |
| **Logistics** | Browse available orders, submit bids, view confirmed jobs, chat, payments |
| **Admin** | Verify logistics company registrations, manage users, handle support tickets |

Authentication is enforced via JWT stored in HTTP-Only cookies. Route protection is handled in layout files using `useAuth`.

---

## Pagination

All major list views are paginated using a shared `Pagination` component at `components/shared/pagination.tsx`. API calls support `?page=1&limit=10` and return a `pagination` metadata object.

Paginated pages include:
- Manufacturer: Order Management, Bids, History, Payments, Support
- Logistics: Available Orders, Bids, History, Payments, Support
- Admin: Users, Support Tickets

---

## Internationalization

The app supports **English** and **Nepali** via `react-i18next`. Translation files are located at:

```
public/locales/en.json
public/locales/ne.json
```

Language can be switched from the Settings page. The `I18nProvider` wrapper is included in the root layout.

---

## Maps

Two Mapbox-powered components are used:

- **`LocationRoutePicker`** — interactive geocoder inputs (restricted to Nepal) with OSRM route drawing. Used in the order placement form.
- **`RouteMapDisplay`** — read-only map that renders a saved route. Used on order detail and history pages.

Both components are loaded with `dynamic(..., { ssr: false })` due to Mapbox requiring browser APIs.

---

## Deployment Notes

- Set `NEXT_PUBLIC_API_URL` to your production backend URL on Vercel (under **Project → Settings → Environment Variables**)
- Set `NEXT_PUBLIC_MAPBOX_TOKEN` to your Mapbox public token
- No server-side secrets are required in the frontend

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production build locally
npm run lint       # Run ESLint
```

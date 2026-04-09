# RouteFlow

**RouteFlow** is a full-stack freight logistics platform designed to connect manufacturers with logistics companies across Nepal. It streamlines the freight process through a structured bidding system — manufacturers post shipment orders, logistics companies place competitive bids, and manufacturers select the best offer to confirm the job.

The platform supports real-time communication, route visualization, payment processing, and a complete order lifecycle from placement to delivery.

---

## Repositories

| Layer | Technology | Deployment |
|---|---|---|
| Frontend | Next.js 16 + TypeScript | Vercel |
| Backend | Node.js + Express.js | Render |
| Database | MongoDB Atlas | Cloud |

Live: **https://route-flow-xi.vercel.app**

---

## Features

- **Role-based access** — Separate dashboards and permissions for Manufacturers, Logistics Companies, and Admins
- **Order management** — Full lifecycle: draft → published → bidding → confirmed → in-transit → delivered
- **Bidding system** — Logistics companies submit price offers; manufacturers review and accept one bid to confirm
- **Real-time chat** — Persistent messaging between manufacturers and logistics companies with file attachment support
- **Real-time notifications** — Socket.io powered alerts for bids, order updates, and messages
- **Route visualization** — Interactive Mapbox maps with geocoding restricted to Nepal; read-only route display on order cards
- **Payments** — Khalti and eSewa sandbox integrations with full payment history
- **Admin panel** — User verification, company document review, and support ticket management
- **Internationalization** — English and Nepali language support via react-i18next
- **Help & Support** — Ticketing system with admin reply capability
- **Profile management** — Avatar and document uploads for logistics company verification

---

## Project Structure

```
routeflow/
├── frontend/        # Next.js 16 application
├── backend/         # Express.js API server
└── README.md
```

See [`frontend/README.md`](./frontend/README.md) and [`backend/README.md`](./backend/README.md) for setup instructions specific to each service.

---

## Quick Start

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Mapbox account (for map token)
- Khalti and/or eSewa developer accounts (for payment sandbox)

### Clone the repository

```bash
git clone https://github.com/your-username/routeflow.git
cd routeflow
```

### Setup

Follow the setup guides in each sub-directory:

```bash
# Backend
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev

# Frontend (in a new terminal)
cd frontend
cp .env.example .env.local
# Fill in your .env.local values
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`  
Backend runs at `http://localhost:5000`

---

## Seed Data

The backend includes a Faker.js seed script to populate the database with realistic test data:

```bash
cd backend
node seed.js
```

All seeded accounts use the password: `Password@123`

---

## Tech Stack

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js v5
- **Database:** MongoDB + Mongoose v9
- **Real-time:** Socket.io v4
- **Auth:** JWT via HTTP-Only cookies
- **File uploads:** Multer
- **Email:** Nodemailer
- **Payments:** Khalti, eSewa

### Frontend
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Maps:** Mapbox GL JS + Mapbox Geocoder
- **UI:** Ant Design
- **i18n:** react-i18next
- **Real-time:** socket.io-client
- **Notifications:** react-toastify

---

## License

MIT

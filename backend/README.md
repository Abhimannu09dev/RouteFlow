# RouteFlow — Backend

The RouteFlow backend is a RESTful API server built with Express.js, handling authentication, order management, bidding, payments, real-time events, and file uploads. It uses ES Modules throughout and connects to MongoDB Atlas.

---

## Tech Stack

- **Node.js** — ES Modules (`"type": "module"`)
- **Express.js v5**
- **MongoDB + Mongoose v9**
- **Socket.io v4** — real-time notifications and chat
- **JWT** — authentication via HTTP-Only cookies
- **Multer** — file upload handling
- **Nodemailer** — transactional email (OTP, password reset)
- **Khalti + eSewa** — payment gateway integrations

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/routeflow.git
cd routeflow/backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in all required values. See the [Environment Variables](#environment-variables) section below.

### 3. Run the development server

```bash
npm run dev
```

The server starts at `http://localhost:5000`.

---

## Environment Variables

Create a `.env` file in the `backend/` directory using the template below:

```env
# ───────────────────────────────────────────
# Server
# ───────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ───────────────────────────────────────────
# Database
# ───────────────────────────────────────────
# MongoDB Atlas connection string
# Format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
MONGO_URI=mongodb+srv://your_user:your_password@cluster0.mongodb.net/routeflow?retryWrites=true&w=majority

# ───────────────────────────────────────────
# Authentication
# ───────────────────────────────────────────
# A long, random secret string used to sign JWT tokens
JWT_SECRET=your_jwt_secret_here

# ───────────────────────────────────────────
# Frontend
# ───────────────────────────────────────────
# Must match the exact origin of your frontend (no trailing slash)
# Development: http://localhost:3000
# Production:  https://your-vercel-domain.vercel.app
FRONTEND_URL=http://localhost:3000

# ───────────────────────────────────────────
# Email (Nodemailer)
# ───────────────────────────────────────────
# Gmail address used to send OTPs and password reset emails
EMAIL_USER=your_email@gmail.com
# Gmail App Password (not your account password)
# Generate at: https://myaccount.google.com/apppasswords
EMAIL_PASS=your_gmail_app_password

# ───────────────────────────────────────────
# Payments — Khalti
# ───────────────────────────────────────────
# Sandbox secret key from https://test-admin.khalti.com
KHALTI_SECRET_KEY=your_khalti_secret_key

# ───────────────────────────────────────────
# Payments — eSewa
# ───────────────────────────────────────────
# eSewa sandbox merchant code
# Default sandbox value: EPAYTEST
ESEWA_MERCHANT_CODE=EPAYTEST
```

> **Note:** For Gmail, you must use an [App Password](https://myaccount.google.com/apppasswords), not your regular account password. Two-factor authentication must be enabled on your Google account first.

---

## File Structure

```
backend/
├── index.js                        # Entry point — Express setup, CORS, Socket.io init
├── package.json                    # type: "module"
├── seed.js                         # Faker.js seed script
├── controllers/
│   ├── adminController.js
│   ├── adminSupportController.js
│   ├── chatController.js
│   ├── notificationController.js
│   ├── orderController.js          # parsePagination + buildPaginationMeta helpers
│   ├── paymentController.js        # Khalti + eSewa (lazy secret key read)
│   ├── priceController.js
│   ├── priceOfferController.js
│   ├── profileController.js        # Uses import.meta.url for __dirname
│   ├── settingsController.js
│   ├── supportController.js
│   └── userController.js
├── middleware/
│   ├── auth.js                     # JWT verification + role guard
│   └── upload.js                   # Multer configuration
├── models/
│   ├── messageModel.js
│   ├── notificationModel.js
│   ├── orderModel.js
│   ├── paymentModel.js
│   ├── priceOfferModel.js
│   ├── supportTicketModel.js
│   └── userModel.js
├── routes/
│   ├── index.js                    # Route registration (order matters — see below)
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   ├── notificationRoutes.js
│   ├── orderRoutes.js
│   ├── paymentRoutes.js
│   ├── priceOfferRoutes.js
│   ├── profileRoutes.js
│   ├── settingsRoutes.js
│   └── supportRoutes.js
├── utils/
│   └── mailer.js
└── websocket/
    ├── index.js
    ├── connectionManager.js
    └── orderEvents.js
```

---

## API Overview

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-otp` | Verify email OTP |
| POST | `/auth/login` | Login and set JWT cookie |
| POST | `/auth/logout` | Clear session cookie |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Set new password |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | Get available orders (paginated) |
| POST | `/orders` | Create new order |
| GET | `/my-orders` | Get own orders (paginated) |
| GET | `/orders/:orderId` | Get order detail |
| PATCH | `/orders/:orderId/status` | Update order status |

### Bidding
| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/:orderId/offers` | Submit a bid |
| GET | `/orders/:orderId/offers` | Get bids for an order |
| GET | `/orders/my-offers` | Get own submitted bids (paginated) |
| PATCH | `/orders/:orderId/offers/:offerId/accept` | Accept a bid |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/payment/khalti/initiate` | Initiate Khalti payment |
| GET | `/payment/khalti/verify` | Verify Khalti callback |
| POST | `/payment/esewa/initiate` | Initiate eSewa payment |
| GET | `/payment/esewa/verify` | Verify eSewa callback |
| GET | `/payment/my-payments` | Payment history (paginated) |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | All users (paginated) |
| PATCH | `/admin/users/:userId/verify` | Approve/reject logistics |
| GET | `/admin/support-tickets` | All tickets (paginated) |
| POST | `/admin/support-tickets/:ticketId/reply` | Reply to ticket |

---

## Pagination

All list endpoints support `?page=1&limit=10` query parameters.

**Response shape:**
```json
{
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Seed Script

Populate the database with realistic test data:

```bash
node seed.js
```

All generated accounts use the password: **`Password@123`**

---

## Deployment Notes

- **CORS** — `FRONTEND_URL` must exactly match the frontend origin (including protocol, no trailing slash)
- **Cookies** — `secure` and `sameSite` on JWT cookies are automatically set based on `NODE_ENV`. In production (`NODE_ENV=production`) cookies are `secure: true` and `sameSite: "none"` for cross-origin support.
- **Email on Render** — Nodemailer is configured with `family: 4` to force IPv4 DNS resolution, working around Render's free-tier IPv6 limitations.
- **ES Modules** — All relative imports in the backend use `.js` file extensions. Do not use `require()`.

---

## Scripts

```bash
npm run dev      # Start with nodemon (hot reload)
npm start        # Start production server
node seed.js     # Seed database with test data
```

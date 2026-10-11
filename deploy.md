# RouteFlow — Free Deployment Guide

Stack: **Next.js** (frontend) · **Express + SQLite** (backend) · **Socket.io** · **Mapbox**

---

## Overview

| Service | Platform | Free tier |
|---------|----------|-----------|
| Frontend | [Vercel](https://vercel.com) | Unlimited hobby projects |
| Backend | [Render](https://render.com) | 750 hrs/month (Web Service) |
| SQLite DB | Render persistent disk | 1 GB free |

> **SQLite note:** Render spins the service down after 15 min of inactivity on the free tier — the SQLite file persists on the disk mount between cold starts, so no data is lost, but the first request after sleep takes ~30 s.

---

## 1. Backend → Render

### 1.1 Prepare

Make sure `backend/package.json` has:
```json
"scripts": {
  "build": "tsc --project tsconfig.json",
  "start": "node dist/index.js"
}
```

Confirm `tsconfig.json` outputs to `dist/`:
```json
"outDir": "./dist"
```

### 1.2 Create a Web Service on Render

1. Push the repo to GitHub.
2. Go to **render.com → New → Web Service**.
3. Connect your GitHub repo.
4. Set **Root Directory** to `backend`.
5. Set runtime to **Node**.
6. Set **Build Command**: `npm install -g pnpm && pnpm install && pnpm run build`
7. Set **Start Command**: `pnpm start`

### 1.3 Add a Persistent Disk (for SQLite)

1. In your Render service → **Disks → Add Disk**.
2. **Mount Path**: `/data`
3. **Size**: 1 GB (free)

### 1.4 Environment Variables (Render → Environment tab)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render's default) |
| `DB_PATH` | `/data/routeflow.db` |
| `JWT_SECRET` | *(generate a strong secret)* |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `SMTP_HOST` | *(your SMTP provider)* |
| `SMTP_PORT` | *(e.g. 587)* |
| `SMTP_USER` | *(email address)* |
| `SMTP_PASS` | *(app password)* |
| `SELF_URL` | `https://your-service.onrender.com` |

> Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 1.5 CORS

Ensure your backend CORS config reads from `CLIENT_URL`:
```ts
cors({ origin: process.env.CLIENT_URL, credentials: true })
```

---

## 2. Frontend → Vercel

### 2.1 Deploy

1. Go to **vercel.com → New Project**.
2. Import the same GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Framework: **Next.js** (auto-detected).
5. Click **Deploy**.

### 2.2 Environment Variables (Vercel → Settings → Environment Variables)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-service.onrender.com` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | *(your Mapbox public token)* |

Redeploy after adding env vars.

---

## 3. Socket.io

Render's free tier supports WebSockets. No extra config needed — Socket.io falls back to long-polling automatically if the connection drops, so cold-start wakeups are handled gracefully.

If you see CORS errors on the socket handshake, add your Vercel URL to the socket server init:
```ts
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});
```

---

## 4. Mapbox

Your Mapbox token is public (prefixed `NEXT_PUBLIC_`). Restrict it in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/) to your Vercel domain to prevent abuse.

---

## 5. Quick Checklist

- [ ] `CLIENT_URL` on Render points to the Vercel URL
- [ ] `NEXT_PUBLIC_API_URL` on Vercel points to the Render URL
- [ ] Persistent disk mounted at `/data` on Render
- [ ] `DB_PATH=/data/routeflow.db` set on Render
- [ ] JWT secret set (not the dev default)
- [ ] Mapbox token restricted to production domain
- [ ] SMTP credentials set (if email features are used)

---

## Alternatives

| Need | Alternative |
|------|-------------|
| Faster cold starts | [Railway](https://railway.app) — $5 credit/month free |
| Postgres instead of SQLite | Render free Postgres (90 days, then paid) |
| Edge caching for frontend | Vercel handles this automatically |

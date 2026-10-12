# CarePulse — Hospital Management Platform

Appointments, consultation notes, prescriptions, medication reminders and medicine home-delivery in one mobile-first web app.
MERN-style stack (MongoDB · Express · React · Node) with Redis, BullMQ and Socket.io for real-time.

## Features

| Area | What you get |
|---|---|
| Doctor appointments | Search by department / name / condition, live slot picker, in-clinic or video, family-member booking, **reschedule** and **cancel** with refund policy |
| Route timing | Doctors own a weekly timetable (multiple blocks per day) and leaves; slots are generated from it and update live for everybody |
| Real-time confirmation | In-app + socket instantly; **email and WhatsApp are optional** per booking (patient chooses, defaults in profile). Reminders 24h and 1h before |
| Consultation / treatment | Doctor console: vitals, diagnosis, treatment plan, advice, tests, follow-up date; status flow check-in → consult → complete |
| Prescriptions | Structured prescriptions, readable by the patient, printable, one-tap "add to medication tracker" and "order these medicines" |
| Medication tracking | Dose schedule from dosage text (e.g. `1-0-1`), taken / skipped log, adherence, reminders on WhatsApp / email / in-app |
| Medicine delivery | Catalogue, cart, Rx-only gating, GST + delivery fee, online or COD, pharmacist queue, rider auto-assign, live GPS + ETA, delivery-OTP handover |
| Back office | Admin dashboard, doctors / departments / users, settings, notification audit log, inventory and low-stock |
| Roles | patient · doctor · pharmacist · rider · admin |

## Repository layout

```
backend/    Express API, workers, tests            (src/{config,models,services,controllers,routes,validators,middlewares,jobs,sockets,integrations,utils})
frontend/   React 18 + Vite + Tailwind PWA         (src/{app,pages,features,components,hooks,lib,styles})
docs/       db.md · environment.md · scaling.md
```

## Run it

**Requirements:** Node.js >= 20, MongoDB as a **replica set** (`rs0`), Redis >= 5 (6.2+ recommended for BullMQ).

### Option A — Docker

```bash
cp backend/.env.example backend/.env          # set the two JWT secrets (>= 32 chars)
docker compose up --build
docker compose run --rm api node src/utils/seed.js
```

### Option B — Without Docker

```bash
# backend  (http://localhost:5000, API under /api/v1)
cd backend
cp .env.example .env                          # set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
npm install
npm run seed                                  # departments, doctors, medicines, demo users
npm start                                     # or: npm run dev (watch mode)

# frontend (http://localhost:5173)
cd frontend
cp .env.example .env
npm install
npm run dev
```

The Vite dev server proxies `/api` and the socket to `VITE_PROXY_TARGET` (default `http://localhost:5000`), so the browser never needs CORS in dev. Start the **backend first**, otherwise the frontend shows proxy `ECONNREFUSED` errors.

> No local MongoDB? `mongodb-memory-server` (already a dev dependency) can host a throw-away replica set named `rs0` on port 27017. On Windows, a portable Redis build or Memurai works.

### Configuration notes

* `CLIENT_URL` (default `http://localhost:5173`) is always allowed by CORS; add more origins with a comma-separated `CORS_ORIGINS`. Blocked origins get a `403 CORS` that lists the allowed ones.
* Every error response is JSON: `{ success:false, message, code, requestId, details? }`. The same `requestId` is sent in the `X-Request-Id` header and written to the server log (4xx as `warn`, 5xx as `error`).
* Payments, email, WhatsApp and image upload all have **dry-run modes** when credentials are blank, so the whole flow works locally.

### Seed logins

| Role | Login | Password |
|---|---|---|
| Admin | `admin@carepulse.local` | `Admin@12345` (`SEED_ADMIN_PASSWORD`) |
| Patient | `patient@carepulse.local` | `Patient@12345` |
| Doctor | `<first>.<last>@carepulse.local` (e.g. `sanjay.gupta@carepulse.local`) | `Doctor@12345` |
| Pharmacist | `pharmacy@carepulse.local` | `Pharma@12345` |
| Rider | `rider1@carepulse.local` | `Rider@12345` |

All roles sign in at `/login` (login field is `identifier`: `POST /api/v1/auth/login`) and are redirected to their workspace (`/admin`, `/doctor`, `/pharmacist`, `/rider`). Change these before any real deployment.

API docs: `GET /api/v1/openapi.json`. See `docs/environment.md` for every variable, `docs/db.md` for the data model and `docs/scaling.md` for production notes.

## Design decisions worth knowing

* **No double bookings**: partial unique index on `{doctor, startAt}` for locked slots; losers get `409 SLOT_TAKEN` and the UI refreshes the slot grid.
* **Payment holds**: slot held `SLOT_HOLD_MINUTES` while paying; a sweeper expires holds. If a payment lands after expiry the slot is re-claimed, otherwise it is auto-refunded.
* **Auth**: short-lived access token kept in memory, rotating httpOnly refresh cookie with reuse detection (a replayed token revokes the whole family).
* **Optional channels**: `notifyUser` always writes the in-app notification, then queues email / WhatsApp only if the user opted in and credentials exist. Every attempt is audited.
* **Delivery OTP** is derived by HMAC from the order id, never stored.
* **IST everywhere** for slot maths (fixed +05:30), stored as UTC instants plus an IST `date` string for indexing.

## Testing & known issues

* `cd backend && npm test` — unit tests (`node --test`) plus integration tests (Jest, in-memory Mongo/Redis).
* Verified locally: backend boots against a Mongo replica set + Redis, seed runs, login and the main API flow work, frontend dev server serves the app.
* `npm run build` in `frontend` currently fails at the PWA step (`vite-plugin-pwa`: `Dynamic require of "workbox-build`); the dev server is unaffected.
* Real Razorpay / SMTP / WhatsApp / ImageKit calls are only exercised when you supply credentials.

# Environment variables

Backend: `backend/.env` (template: `backend/.env.example`, validated by zod in `src/config/env.js` — the process refuses to start on invalid values).
Frontend: `frontend/.env` (public values only; anything `VITE_*` ships to the browser).

## Backend

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | development | `production` enables secure cookies check, JSON logs |
| `PORT` | 5000 | |
| `CLIENT_URL`, `CORS_ORIGINS` | localhost:5173 | Comma-separated allow-list; credentials enabled |
| `MONGO_URI` | — | Use a replica set URI |
| `REDIS_URL` | — | Rate limits, cache, BullMQ, Socket.io adapter. **Use `noeviction`.** |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | — | ≥ 32 chars, different. Access secret also derives delivery OTPs |
| `ACCESS_TTL`, `REFRESH_TTL_DAYS` | 15m, 30 | |
| `COOKIE_SECURE`, `COOKIE_DOMAIN` | false, — | `true` behind HTTPS |
| `OTP_DEV_MODE` | true | `true` returns the WhatsApp login OTP in the API response — **must be false in production** |
| `SLOT_HOLD_MINUTES` | 10 | Payment hold on a slot |
| `BOOKING_WINDOW_DAYS`, `MIN_LEAD_MINUTES` | 30, 30 | |
| `FREE_CANCEL_HOURS`, `MAX_RESCHEDULES` | 4, 2 | Refund policy / reschedule cap |
| `PAYMENT_REQUIRED` | true | `false` = confirm immediately, pay at clinic |
| `MEET_BASE_URL` | meet.jit.si | Video consult rooms |
| `DELIVERY_FEE`, `FREE_DELIVERY_ABOVE`, `GST_PERCENT` | 40, 500, 12 | Overridable at runtime in Admin → Settings |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | blank | Blank = **dry-run payments** (a fake order that the client confirms) |
| `IMAGEKIT_*` | blank | Blank = image upload disabled |
| `EMAIL_ENABLED`, `SMTP_*`, `EMAIL_FROM` | — | No `SMTP_HOST` = dry-run (logged, status `dry_run`) |
| `WHATSAPP_ENABLED`, `WHATSAPP_PROVIDER` | dryrun | `dryrun | meta | twilio` |
| `WA_META_TOKEN`, `WA_META_PHONE_ID`, `WA_META_TEMPLATE_LANG` | — | Meta Cloud API; templates named after notification types must be approved in Meta Business |
| `TWILIO_*` | — | Twilio WhatsApp sandbox / sender |
| `DEFAULT_COUNTRY_CODE` | 91 | For normalising 10-digit phones |
| `START_WORKER` | true | Run BullMQ workers inside the API process. Set false on API pods and run `npm run worker` separately at scale |
| `SEED_ADMIN_EMAIL/PASSWORD` | — | Used by `npm run seed` |

## Optional notifications

Email and WhatsApp are **per-patient opt-in**: the booking form has two checkboxes (defaults from `User.prefs.notify`, editable in Profile).
The in-app notification and socket push always happen. With no SMTP / WhatsApp credentials the channels run in dry-run and appear in Admin → Notification log.

## Frontend

`VITE_API_URL` (blank in dev → proxy), `VITE_SOCKET_URL`, `VITE_PROXY_TARGET`, `VITE_RAZORPAY_KEY_ID` (public key), `VITE_APP_NAME`.

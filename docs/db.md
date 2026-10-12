# CarePulse — Database design (MongoDB 7, Mongoose 8)

MongoDB runs as a **replica set** (even single node) so change streams / transactions can be adopted later; the current code
relies on single-document atomicity and unique indexes, not multi-document transactions.

## Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | All accounts (patient, doctor, pharmacist, rider, admin) | `role`, `email?`, `phone?`, `passwordHash`, `addresses[]`, `familyMembers[]`, `prefs.notify{email,whatsapp}`, `rider{online,location,activeOrders}`, `isActive` |
| `refreshtokens` | Rotating refresh tokens (hashed) | `user`, `family`, `tokenHash`, `usedAt`, `revokedAt`, TTL on `expiresAt` |
| `departments` | Specialities | `name`, `slug`, `sortOrder`, `isActive` |
| `doctorprofiles` | Doctor public profile + **route timing** | `user`, `department`, `fees{in_person,video}`, `modes[]`, `slotMinutes`, `weekly[{day,ranges[{start,end}]}]`, `leaves[]`, `rating{avg,count}` |
| `appointments` | Bookings, consult notes, history | `code`, `patient`, `doctor`, `startAt/endAt`, `date` (IST), `mode`, `status`, `slotLocked`, `holdExpiresAt`, `notify{email,whatsapp}`, `consultation{…}`, `history[]` |
| `prescriptions` | Issued by doctors | `code`, `appointment`, `patient`, `items[{name,dosage,frequency,duration,meal,instructions}]`, `diagnosis`, `advice` |
| `medications` | Patient medication tracker (from Rx or self-added) | `patient`, `name`, `times[]` (HH:mm IST), `startDate/endDate`, `remindersOn`, `doses[]` (taken/skipped log) |
| `medicines` | Pharmacy catalogue | `name`, `generic`, `price`, `mrp`, `stock`, `lowStockAt`, `requiresPrescription`, text index |
| `medicineorders` | Home delivery orders | `code`, `items[]` (price snapshot), `address`, `total`, `status`, `payMethod`, `rider`, `riderLocation`, `etaMinutes`, `history[]` |
| `payments` | Razorpay records (appointments + orders) | `purpose`, `refId`, `amount`, `status`, `razorpay{orderId,paymentId}`, `refund` |
| `notifications` | In-app inbox (always written) | `user`, `type`, `title`, `body`, `ref`, `readAt`, TTL 90d |
| `notificationlogs` | Audit of email / WhatsApp attempts | `channel`, `to`, `status` (`queued|sent|failed|dry_run`), `provider`, `error`, TTL 60d |
| `reviews` | One per completed appointment | `appointment`, `doctor`, `rating`, `comment` |
| `settings` | Admin-editable runtime overrides | `key`, `value` |

## Indexes that matter

* `appointments {doctor, startAt}` **unique, partial on `slotLocked:true`** — the double-booking guard. A cancelled / expired / rescheduled-away appointment sets `slotLocked:false`, freeing the slot.
* `appointments {status, holdExpiresAt}` — sweeper for unpaid holds.
* `appointments {status, startAt}` — reminder scan (24h / 1h).
* `appointments {doctorUser, date, startAt}` — doctor's day queue.
* `appointments {patient, startAt:-1}` — patient history (cursor pagination).
* `users.email`, `users.phone` unique **partial** (so email-only and phone-only accounts coexist).
* `medicines` text index + `{isActive, category, price}`; `{stock}` for low-stock.
* `medicineorders {status, createdAt}` pharmacy queue; `{rider, status}` rider list.
* TTL: `refreshtokens.expiresAt`, `notifications.createdAt` (90d), `notificationlogs.createdAt` (60d).

## Slot model

Slots are **not stored**. They are generated on read from `weekly` minus `leaves` minus occupied appointments, using fixed IST (+05:30) arithmetic.
Only a *booking* creates a document; the partial unique index makes concurrent bookings of the same slot fail with `E11000`, mapped to HTTP 409 `SLOT_TAKEN`.

## Status machines (see `utils/constants.js`)

Appointment: `pending_payment → booked → checked_in → in_consultation → completed`; `booked|pending_payment → cancelled`; `pending_payment → expired`; `booked → no_show`.
Order: `pending_payment → placed → confirmed → packed → out_for_delivery → delivered`; `placed|confirmed → rejected`; early states → `cancelled`.
Transitions are compare-and-set (`updateOne({_id, status: from}, …)`), so two actors cannot both win a race.

## Money

Amounts are stored as rupee numbers (2 dp max) with price snapshots on order items. Razorpay amounts are converted to paise at the boundary.

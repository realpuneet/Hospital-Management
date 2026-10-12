# Scaling notes

The app is built to scale horizontally; these are the levers, in the order you will need them.

1. **Stateless API pods.** JWT access tokens; refresh tokens are in Mongo. Run N pods behind a load balancer. Set `START_WORKER=false` on API pods.
2. **Dedicated workers.** `npm run worker` consumes `notify` (email / WhatsApp delivery, concurrency 20) and `maintenance` (a single repeatable `tick` per minute: reminders, hold expiry, unpaid-order sweep, medication dose reminders). BullMQ de-duplicates the tick by `jobId`, so many workers are safe.
3. **Socket.io** uses the Redis adapter; workers emit through a Redis pub/sub bridge. Use sticky sessions or websocket-only transport at the LB.
4. **Redis**: one instance for cache + rate limit + BullMQ is fine to start; split BullMQ onto its own instance (noeviction) first when memory pressure appears.
5. **MongoDB**: reads are index-covered (see `db.md`). Add read replicas for listings, shard `appointments` by `doctor` hash when a single replica set is saturated. The double-booking index includes `doctor`, so it stays shard-local with that key.
6. **Caching**: namespace-versioned cache (`utils/cache.js`) for departments, doctor listings, settings and the admin dashboard (60s). Invalidate by bumping the namespace version.
7. **Slots** are computed on demand and cached per doctor/day for seconds; the unique index is the source of truth, never the cache.
8. **Rate limits** are Redis fixed windows and fail open if Redis is down.
9. **Front end**: static build on a CDN, route-level code splitting, PWA shell cache, images through ImageKit.

Back-of-envelope: a booking is 1 indexed insert + 2 queue jobs; the hot path is slot listing (1 doctor read + 1 indexed range query per doctor-day).

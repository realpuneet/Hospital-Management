/** Lightweight OpenAPI 3 description (served at /api/v1/openapi.json). Import into Postman/Insomnia/Swagger UI. */
const j = (description) => ({ description, content: { 'application/json': { schema: { type: 'object' } } } });
const path = (method, summary, tag, { auth = true, body = false } = {}) => ({
  [method]: { summary, tags: [tag], ...(auth ? { security: [{ bearer: [] }] } : {}), ...(body ? { requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } } : {}), responses: { 200: j('OK') } },
});

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'CarePulse Hospital API', version: '1.0.0', description: 'Appointments, prescriptions, medication tracking, pharmacy delivery and realtime notifications.' },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/auth/register': path('post', 'Create patient account', 'Auth', { auth: false, body: true }),
    '/auth/login': path('post', 'Login with email/phone + password', 'Auth', { auth: false, body: true }),
    '/auth/otp/request': path('post', 'Request WhatsApp OTP', 'Auth', { auth: false, body: true }),
    '/auth/otp/verify': path('post', 'Verify OTP (login / signup)', 'Auth', { auth: false, body: true }),
    '/auth/refresh': path('post', 'Rotate refresh cookie, get new access token', 'Auth', { auth: false }),
    '/auth/me': path('get', 'Current user', 'Auth'),
    '/departments': path('get', 'List departments', 'Catalog', { auth: false }),
    '/doctors': path('get', 'Search doctors', 'Catalog', { auth: false }),
    '/doctors/{id}/slots': path('get', 'Availability calendar (no date) or day slots (?date=)', 'Catalog', { auth: false }),
    '/appointments': { ...path('post', 'Book appointment (Idempotency-Key supported)', 'Appointments', { body: true }), ...path('get', 'My appointments (?tab=upcoming|past)', 'Appointments') },
    '/appointments/{id}/reschedule': path('post', 'Reschedule', 'Appointments', { body: true }),
    '/appointments/{id}/cancel': path('post', 'Cancel (auto refund by policy)', 'Appointments', { body: true }),
    '/appointments/{id}/join': path('get', 'Video consultation link (opens 10 min before)', 'Appointments'),
    '/prescriptions': path('get', 'My prescriptions', 'Prescriptions'),
    '/prescriptions/medications/today': path('get', "Today's dose checklist", 'Medication'),
    '/prescriptions/medications/{id}/dose': path('post', 'Mark a dose taken', 'Medication', { body: true }),
    '/medicines': path('get', 'Browse pharmacy catalogue', 'Pharmacy', { auth: false }),
    '/orders': { ...path('post', 'Place medicine order', 'Pharmacy', { body: true }), ...path('get', 'My orders', 'Pharmacy') },
    '/orders/{id}': path('get', 'Order detail + tracking', 'Pharmacy'),
    '/doctor/appointments': path('get', "Doctor's appointments (?date=)", 'Doctor'),
    '/doctor/appointments/{id}/prescription': path('put', 'Write/update prescription', 'Doctor', { body: true }),
    '/doctor/schedule': path('put', 'Update weekly timings', 'Doctor', { body: true }),
    '/pharmacy/orders': path('get', 'Order queue', 'Pharmacy back-office'),
    '/rider/orders': path('get', 'Assigned deliveries', 'Rider'),
    '/rider/location': path('post', 'GPS heartbeat', 'Rider', { body: true }),
    '/admin/dashboard': path('get', 'KPIs', 'Admin'),
    '/payments/verify': path('post', 'Verify Razorpay checkout', 'Payments', { body: true }),
    '/payments/webhook': path('post', 'Razorpay webhook (HMAC)', 'Payments', { auth: false }),
  },
};

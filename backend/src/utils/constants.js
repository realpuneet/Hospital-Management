export const ROLES = Object.freeze({
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  PHARMACIST: 'pharmacist',
  RIDER: 'rider',
});
export const ROLE_LIST = Object.values(ROLES);
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.RIDER];

export const APPT_MODE = Object.freeze({ IN_PERSON: 'in_person', VIDEO: 'video' });
export const APPT_MODES = Object.values(APPT_MODE);

export const APPT_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  BOOKED: 'booked',
  CHECKED_IN: 'checked_in',
  IN_CONSULTATION: 'in_consultation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
});
export const APPT_STATUS_LIST = Object.values(APPT_STATUS);
/** statuses that occupy a slot */
export const APPT_ACTIVE = [
  APPT_STATUS.PENDING_PAYMENT,
  APPT_STATUS.BOOKED,
  APPT_STATUS.CHECKED_IN,
  APPT_STATUS.IN_CONSULTATION,
];
/** appointment state machine (doctor/staff driven transitions) */
export const APPT_TRANSITIONS = {
  [APPT_STATUS.PENDING_PAYMENT]: [APPT_STATUS.BOOKED, APPT_STATUS.CANCELLED, APPT_STATUS.EXPIRED],
  [APPT_STATUS.BOOKED]: [APPT_STATUS.CHECKED_IN, APPT_STATUS.IN_CONSULTATION, APPT_STATUS.CANCELLED, APPT_STATUS.NO_SHOW],
  [APPT_STATUS.CHECKED_IN]: [APPT_STATUS.IN_CONSULTATION, APPT_STATUS.CANCELLED, APPT_STATUS.NO_SHOW],
  [APPT_STATUS.IN_CONSULTATION]: [APPT_STATUS.COMPLETED],
  [APPT_STATUS.COMPLETED]: [],
  [APPT_STATUS.CANCELLED]: [],
  [APPT_STATUS.NO_SHOW]: [],
  [APPT_STATUS.EXPIRED]: [],
};

export const PAY_STATUS = Object.freeze({
  NONE: 'none',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  AT_CLINIC: 'at_clinic',
  COD: 'cod',
});

export const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
});
export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);
export const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PLACED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PACKED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REJECTED]: [],
};

export const PAY_PURPOSE = Object.freeze({ APPOINTMENT: 'appointment', MEDICINE_ORDER: 'medicine_order' });

export const NOTIFY_TYPE = Object.freeze({
  APPT_CONFIRMED: 'appointment.confirmed',
  APPT_RESCHEDULED: 'appointment.rescheduled',
  APPT_CANCELLED: 'appointment.cancelled',
  APPT_REMINDER: 'appointment.reminder',
  APPT_COMPLETED: 'appointment.completed',
  APPT_NEW_FOR_DOCTOR: 'appointment.new',
  RX_READY: 'prescription.ready',
  MED_REMINDER: 'medication.reminder',
  ORDER_UPDATE: 'order.update',
  ORDER_NEW: 'order.new',
  SYSTEM: 'system',
});

export const MEAL_TIMING = ['before_food', 'after_food', 'with_food', 'any'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

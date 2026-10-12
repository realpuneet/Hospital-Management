import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Medicine } from '../models/Medicine.js';
import { MedicineOrder } from '../models/MedicineOrder.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { APPT_STATUS as S } from '../utils/constants.js';
import { addDays, todayStr } from '../utils/helpers.js';
import { cacheGetOrSet } from '../utils/cache.js';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));

export const adminDashboard = () =>
  cacheGetOrSet('analytics', 'admin', 60, async () => {
    const today = todayStr();
    const from14 = addDays(today, -13);
    const since30 = new Date(Date.now() - 30 * 86400_000);
    const [apptToday, trend, users, revenue, orders, topDoctors, lowStock, pendingRx, notif] = await Promise.all([
      Appointment.aggregate([{ $match: { date: today } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $match: { date: { $gte: from14 }, status: { $in: [S.BOOKED, S.CHECKED_IN, S.IN_CONSULTATION, S.COMPLETED] } } },
        { $group: { _id: '$date', appointments: { $sum: 1 }, video: { $sum: { $cond: [{ $eq: ['$mode', 'video'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: since30 } } },
        { $group: { _id: '$purpose', amount: { $sum: '$amount' }, n: { $sum: 1 } } },
      ]),
      MedicineOrder.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $match: { status: S.COMPLETED, completedAt: { $gte: since30 } } },
        { $group: { _id: '$doctor', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'doctorprofiles', localField: '_id', foreignField: '_id', as: 'd' } },
        { $project: { n: 1, name: { $arrayElemAt: ['$d.name', 0] }, specialization: { $arrayElemAt: ['$d.specialization', 0] } } },
      ]),
      Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockAt'] } }),
      MedicineOrder.countDocuments({ status: 'placed' }),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        { $group: { _id: { c: '$channel', s: '$status' }, n: { $sum: 1 } } },
      ]),
    ]);
    return {
      today: countBy(apptToday),
      trend: trend.map((t) => ({ date: t._id, appointments: t.appointments, video: t.video })),
      users: countBy(users),
      revenue30d: Object.fromEntries(revenue.map((r) => [r._id, { amount: r.amount, count: r.n }])),
      orders: countBy(orders),
      topDoctors,
      lowStock,
      newOrders: pendingRx,
      notifications30d: notif.map((n) => ({ channel: n._id.c, status: n._id.s, count: n.n })),
    };
  });

export async function doctorDashboard(userId) {
  const today = todayStr();
  const profile = await DoctorProfile.findOne({ user: userId }).select('rating _id').lean();
  const weekAgo = addDays(today, -6);
  const [byStatus, next, week, patients] = await Promise.all([
    Appointment.aggregate([{ $match: { doctorUser: userId, date: today } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Appointment.findOne({ doctorUser: userId, status: { $in: [S.BOOKED, S.CHECKED_IN] }, endAt: { $gte: new Date() } }).sort({ startAt: 1 }).populate('patient', 'name phone').lean(),
    Appointment.aggregate([
      { $match: { doctorUser: userId, date: { $gte: weekAgo, $lte: today }, status: S.COMPLETED } },
      { $group: { _id: '$date', n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.distinct('patient', { doctorUser: userId, status: S.COMPLETED }),
  ]);
  return { today: countBy(byStatus), next, week: week.map((w) => ({ date: w._id, count: w.n })), totalPatients: patients.length, rating: profile?.rating };
}

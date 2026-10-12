import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { allowedOrigins } from '../config/cors.js';
import { createRedisConnection, getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { MedicineOrder } from '../models/MedicineOrder.js';
import { ROLES } from '../utils/constants.js';

let io;
const CHANNEL = 'socket:emit';

/**
 * Emit from anywhere (API process or the BullMQ worker).
 * - API: broadcast through the Socket.io Redis adapter.
 * - Worker (no io instance): publish on Redis; API nodes re-emit to their local sockets.
 */
export function emit(room, event, payload) {
  if (io) {
    io.to(room).emit(event, payload);
    return;
  }
  getRedis()
    .publish(CHANNEL, JSON.stringify({ room, event, payload }))
    .catch(() => {});
}
export const emitToUser = (userId, event, payload) => emit(`user:${userId}`, event, payload);
export const emitToRole = (role, event, payload) => emit(`role:${role}`, event, payload);

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e5,
    transports: ['websocket', 'polling'],
  });

  const pub = createRedisConnection();
  const sub = pub.duplicate();
  sub.on('error', (e) => logger.error({ err: e.message }, 'redis sub error'));
  io.adapter(createAdapter(pub, sub));

  // bridge for events published by worker processes
  const bridge = createRedisConnection();
  bridge.subscribe(CHANNEL).catch(() => {});
  bridge.on('message', (_c, msg) => {
    try {
      const { room, event, payload } = JSON.parse(msg);
      io.local.to(room).emit(event, payload);
    } catch {
      /* ignore */
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub).select('role isActive name').lean();
      if (!user || !user.isActive) return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), role: user.role, name: user.name };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    if (role === ROLES.DOCTOR) {
      const dp = await DoctorProfile.findOne({ user: id }).select('_id').lean();
      if (dp) socket.join(`doctor:${dp._id}`);
    }

    // watch a doctor's slots live while a patient is choosing a time
    socket.on('slots:watch', (doctorId) => {
      if (mongoose.isValidObjectId(doctorId)) socket.join(`slots:${doctorId}`);
    });
    socket.on('slots:unwatch', (doctorId) => socket.leave(`slots:${doctorId}`));

    // track a medicine order live (owner, assigned rider or staff only)
    socket.on('order:watch', async (orderId, ack) => {
      try {
        if (!mongoose.isValidObjectId(orderId)) return ack?.({ ok: false });
        const o = await MedicineOrder.findById(orderId).select('patient rider').lean();
        const allowed =
          o && (String(o.patient) === id || String(o.rider) === id || [ROLES.ADMIN, ROLES.PHARMACIST].includes(role));
        if (!allowed) return ack?.({ ok: false });
        socket.join(`order:${orderId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });
    socket.on('order:unwatch', (orderId) => socket.leave(`order:${orderId}`));
  });

  logger.info('Socket.io ready');
  return io;
}

export const getIO = () => io;

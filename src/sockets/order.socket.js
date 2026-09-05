import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/db.js';

let ioInstance = null;

export function initSocketServer(io) {
  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers['authorization']?.startsWith('Bearer ')
          ? socket.handshake.headers['authorization'].split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Socket authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, name: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('Socket authentication error: User inactive or not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error(`Socket authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 [Socket.io] Client connected: ${user.name} (${user.role}) - Socket ID: ${socket.id}`);

    // Join personal room for this user
    socket.join(`user:${user.id}`);

    // If Admin or Sales Agent, join staff notifications room
    if (user.role === 'ADMIN' || user.role === 'SALES_AGENT') {
      socket.join('staff:orders');
    }

    // Support both 'order:join' and 'join_order_room'
    socket.on('order:join', async (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on('order:leave', (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) socket.leave(`order:${orderId}`);
    });

    // Join specific Order tracking room (with IDOR protection!)
    socket.on('join_order_room', async (orderId) => {
      try {
        if (!orderId) return;

        // Verify customer owns the order unless staff
        if (user.role === 'CUSTOMER') {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true },
          });

          if (!order || order.userId !== user.id) {
            socket.emit('error', { message: 'Unauthorized to track this order' });
            return;
          }
        }

        const room = `order:${orderId}`;
        socket.join(room);
        console.log(`📡 [Socket.io] User ${user.email} joined room: ${room}`);
        socket.emit('joined_room', { room, orderId });
      } catch (err) {
        console.error('Error joining order room:', err);
      }
    });

    socket.on('leave_order_room', (orderId) => {
      const room = `order:${orderId}`;
      socket.leave(room);
      console.log(`👋 [Socket.io] User ${user.email} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ [Socket.io] Client disconnected: ${user.email}`);
    });
  });
}

/**
 * Emit real-time status update to order room, customer room, and staff room
 */
export function emitOrderStatusUpdate(orderId, updateData) {
  if (!ioInstance) {
    console.warn('Socket.io instance not initialized yet.');
    return;
  }

  // 1. Order tracking room
  ioInstance.to(`order:${orderId}`).emit('order:status_updated', updateData);
  ioInstance.to(`order:${orderId}`).emit('ORDER_UPDATED', updateData);

  // 2. Customer personal room
  ioInstance.to(`user:${updateData.userId}`).emit('order:status_updated', updateData);
  ioInstance.to(`user:${updateData.userId}`).emit('ORDER_UPDATED', updateData);

  // 3. Staff room (Admin & Sales Agents)
  ioInstance.to('staff:orders').emit('order:status_updated', updateData);
  ioInstance.to('staff:orders').emit('ORDER_UPDATED', updateData);
  ioInstance.to('staff:orders').emit('NEW_ORDER', updateData);
  ioInstance.to('staff:orders').emit('order:created', updateData);

  // 4. Global broadcast fallback
  ioInstance.emit('ORDER_UPDATED', updateData);
  ioInstance.emit('order:status_updated', updateData);

  console.log(`📢 [Socket.io] Broadcasted order update: Order #${updateData.orderNumber} -> ${updateData.status}`);
}

export function getSocketIO() {
  return ioInstance;
}

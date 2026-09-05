import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { emitOrderStatusUpdate } from '../sockets/order.socket.js';

export class OrderService {
  static async getOrderById(orderId, user) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        payment: true,
        refund: true,
        coupon: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // IDOR Protection: Customer cannot view another customer's order
    if (user.role === 'CUSTOMER' && order.userId !== user.id) {
      throw new AppError('Forbidden: You are not authorized to view this order', 403, 'UNAUTHORIZED_ORDER_ACCESS');
    }

    return order;
  }

  static async getOrders(user, filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const where = {};

    // Customers only see their own orders
    if (user.role === 'CUSTOMER') {
      where.userId = user.id;
    }

    if (filters.status) {
      const validStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      let targetStatus = String(filters.status).toUpperCase();
      if (targetStatus === 'PENDING') targetStatus = 'CONFIRMED';
      if (validStatuses.includes(targetStatus)) {
        where.status = targetStatus;
      }
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          payment: true,
          refund: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  static async updateOrderStatus(orderId, newStatus, notes, user) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('Cannot update status of a cancelled order', 400, 'ORDER_ALREADY_CANCELLED');
    }

    if (order.status === 'DELIVERED') {
      throw new AppError('Order is already delivered and finalized', 400, 'ORDER_ALREADY_DELIVERED');
    }

    const validTransitions = {
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'], // Cancellation after shipment is blocked!
      DELIVERED: [],
      CANCELLED: [],
    };

    let normalizedStatus = newStatus === 'PENDING' ? 'CONFIRMED' : newStatus;
    if (!validTransitions[order.status]?.includes(normalizedStatus)) {
      throw new AppError(
        `Invalid status transition from "${order.status}" to "${newStatus}".`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const previousStatus = order.status;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: { status: normalizedStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: normalizedStatus,
          notes: notes || `Order status updated to ${newStatus}`,
          changedById: user.id,
        },
      });

      return ord;
    });

    // Real-Time Socket.io Push to order room and user
    emitOrderStatusUpdate(orderId, {
      orderId,
      orderNumber: updatedOrder.orderNumber,
      status: normalizedStatus,
      previousStatus,
      notes: notes || `Order status updated to ${newStatus}`,
      updatedAt: new Date(),
      userId: updatedOrder.userId,
    });

    return updatedOrder;
  }

  static async cancelOrder(orderId, reason, user) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // IDOR protection: Customer can only cancel their own order
    if (user.role === 'CUSTOMER' && order.userId !== user.id) {
      throw new AppError('Forbidden: You can only cancel your own orders', 403, 'UNAUTHORIZED_ORDER_ACCESS');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('This order is already cancelled', 400, 'ORDER_ALREADY_CANCELLED');
    }

    // Critical Requirement #7: Cancellation after shipment is blocked
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw new AppError(
        `Order cannot be cancelled because it has already been ${order.status.toLowerCase()}. Please initiate a return request instead.`,
        400,
        'CANCELLATION_NOT_ALLOWED'
      );
    }

    // Transactionally cancel order, refund payment, and restore inventory
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // Restore inventory quantities
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE ProductVariant
          SET stockQuantity = stockQuantity + ${item.quantity}
          WHERE id = ${item.variantId}
        `;
      }

      // Create Refund record
      const refund = await tx.refund.create({
        data: {
          orderId,
          amount: order.totalAmount,
          reason: reason || 'Customer requested cancellation',
          status: 'COMPLETED',
          processedById: user.id,
        },
      });

      // Log status change in audit history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CANCELLED',
          notes: `Order cancelled. Refund of $${Number(order.totalAmount).toFixed(2)} processed. Reason: ${reason}`,
          changedById: user.id,
        },
      });

      return { order: updatedOrder, refund };
    });

    // Real-Time Socket.io push
    emitOrderStatusUpdate(orderId, {
      orderId,
      orderNumber: result.order.orderNumber,
      status: 'CANCELLED',
      previousStatus: order.status,
      notes: `Order cancelled and refunded: ${reason}`,
      updatedAt: new Date(),
      userId: order.userId,
    });

    return result;
  }
}

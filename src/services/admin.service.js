import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';

export class AdminService {
  static async getDashboardStats() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      totalOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalSalesAggregate,
      lowStockVariants,
      expiringProducts,
      alreadyExpiredProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMED', 'PROCESSING'] },
        },
      }),
      prisma.order.count({
        where: { status: 'SHIPPED' },
      }),
      prisma.order.count({
        where: { status: 'DELIVERED' },
      }),
      prisma.order.count({
        where: { status: 'CANCELLED' },
      }),
      prisma.order.aggregate({
        where: {
          status: { not: 'CANCELLED' },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.productVariant.findMany({
        where: {
          stockQuantity: { lte: 5 },
        },
        include: {
          product: {
            select: { id: true, title: true, category: true },
          },
        },
        orderBy: { stockQuantity: 'asc' },
        take: 15,
      }),
      prisma.product.findMany({
        where: {
          expiryDate: {
            gt: now,
            lte: thirtyDaysFromNow,
          },
        },
        include: {
          variants: true,
        },
        orderBy: { expiryDate: 'asc' },
        take: 10,
      }),
      prisma.product.count({
        where: {
          expiryDate: { lte: now },
        },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          payment: {
            select: { status: true, paymentMethod: true },
          },
        },
      }),
    ]);

    const totalRevenue = Number(totalSalesAggregate._sum.totalAmount || 0);

    return {
      stats: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        lowStockCount: lowStockVariants.length,
        expiringCount: expiringProducts.length,
        expiredCount: alreadyExpiredProducts,
      },
      lowStockVariants,
      expiringProducts,
      recentOrders,
    };
  }

  static async getCustomers(search = '') {
    const where = {
      role: 'CUSTOMER',
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        salesAgentId: true,
        salesAgent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
        orders: {
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    return customers.map((cust) => {
      const validOrders = cust.orders.filter((o) => o.status !== 'CANCELLED');
      const totalSpend = validOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      return {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        role: cust.role,
        isActive: cust.isActive,
        createdAt: cust.createdAt,
        salesAgentId: cust.salesAgentId,
        salesAgent: cust.salesAgent,
        ordersCount: cust._count.orders,
        orderCount: cust._count.orders,
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalSpent: parseFloat(totalSpend.toFixed(2)),
      };
    });
  }

  static async getSalesAgents() {
    const agents = await prisma.user.findMany({
      where: { role: 'SALES_AGENT' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { assignedCustomers: true },
        },
        assignedCustomers: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            orders: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return agents.map((agent) => {
      let totalAttributedRevenue = 0;
      let totalAttributedOrders = 0;

      const customers = agent.assignedCustomers.map((cust) => {
        const nonCancelledOrders = cust.orders.filter((o) => o.status !== 'CANCELLED');
        const custRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        totalAttributedRevenue += custRevenue;
        totalAttributedOrders += cust.orders.length;

        return {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          createdAt: cust.createdAt,
          ordersCount: cust.orders.length,
          orderCount: cust.orders.length,
          totalRevenue: parseFloat(custRevenue.toFixed(2)),
          totalSpent: parseFloat(custRevenue.toFixed(2)),
          totalSpend: parseFloat(custRevenue.toFixed(2)),
        };
      });

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        isActive: agent.isActive,
        createdAt: agent.createdAt,
        assignedCustomersCount: agent._count.assignedCustomers,
        assignedCustomerCount: agent._count.assignedCustomers,
        totalAttributedOrders,
        attributedOrderCount: totalAttributedOrders,
        totalAttributedRevenue: parseFloat(totalAttributedRevenue.toFixed(2)),
        totalAttributedSales: parseFloat(totalAttributedRevenue.toFixed(2)),
        assignedCustomers: customers,
      };
    });
  }

  static async assignCustomerAgent({ customerId, salesAgentId }) {
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.role !== 'CUSTOMER') {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    if (salesAgentId) {
      const agent = await prisma.user.findUnique({
        where: { id: salesAgentId },
      });

      if (!agent || agent.role !== 'SALES_AGENT') {
        throw new AppError('Target user is not an active Sales Agent', 400, 'INVALID_SALES_AGENT');
      }
    }

    const updated = await prisma.user.update({
      where: { id: customerId },
      data: {
        salesAgentId: salesAgentId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        salesAgentId: true,
        salesAgent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  static async createSalesAgent({ name, email, password }) {
    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400, 'MISSING_FIELDS');
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('User with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'SALES_AGENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return agent;
  }
}

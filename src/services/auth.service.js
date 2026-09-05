import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export class AuthService {
  static async register({ email, password, name, role = 'CUSTOMER' }) {
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400, 'MISSING_FIELDS');
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let assignedAgentId = null;

    if (role === 'CUSTOMER') {
      // Auto-assign to the active Sales Agent with the fewest customers (load balancing)
      const activeAgents = await prisma.user.findMany({
        where: { role: 'SALES_AGENT', isActive: true },
        select: {
          id: true,
          _count: { select: { assignedCustomers: true } },
        },
        orderBy: {
          assignedCustomers: { _count: 'asc' },
        },
        take: 1,
      });

      if (activeAgents.length > 0) {
        assignedAgentId = activeAgents[0].id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        salesAgentId: assignedAgentId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        salesAgentId: true,
        salesAgent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id, user.role);

    return { user, token };
  }

  static async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        salesAgentId: user.salesAgentId,
      },
      token,
    };
  }

  static async googleAuth({ email, name, avatarUrl, mode = 'login' }) {
    if (!email) {
      throw new AppError('Email is required from Google account', 400, 'MISSING_EMAIL');
    }

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        salesAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (mode === 'login') {
      if (!user) {
        throw new AppError('No account found with this Google email. Please Sign Up first to create your account.', 404, 'ACCOUNT_NOT_FOUND');
      }
      if (!user.isActive) {
        throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
      }
    } else {
      // mode === 'register'
      if (user) {
        throw new AppError('An account with this Google email already exists. Please Sign In.', 409, 'ACCOUNT_ALREADY_EXISTS');
      }

      // New Google customer registration: Auto-assign active Sales Agent with fewest customers
      const activeAgents = await prisma.user.findMany({
        where: { role: 'SALES_AGENT', isActive: true },
        select: {
          id: true,
          _count: { select: { assignedCustomers: true } },
        },
        orderBy: {
          assignedCustomers: { _count: 'asc' },
        },
        take: 1,
      });

      const assignedAgentId = activeAgents.length > 0 ? activeAgents[0].id : null;
      const dummyPassword = await bcrypt.hash(`GOOGLE_AUTH_${Date.now()}_${Math.random()}`, 10);

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          password: dummyPassword,
          role: 'CUSTOMER',
          salesAgentId: assignedAgentId,
        },
        include: {
          salesAgent: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        salesAgentId: user.salesAgentId,
        salesAgent: user.salesAgent,
      },
      token,
      isNewUser,
    };
  }

  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  static generateToken(id, role) {
    return jwt.sign({ id, role }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });
  }
}

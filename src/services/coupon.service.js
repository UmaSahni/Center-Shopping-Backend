import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';

export class CouponService {
  static async validateCoupon(code, subtotal, user) {
    if (!code || !code.trim()) {
      throw new AppError('Coupon code is required', 400, 'COUPON_REQUIRED');
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError('Invalid or inactive coupon code', 404, 'COUPON_INVALID');
    }

    const now = new Date();

    // 1. Expiry check
    if (now > coupon.expiryDate) {
      throw new AppError('This coupon has expired and is no longer valid', 400, 'COUPON_EXPIRED');
    }

    // 2. Start date check
    if (now < coupon.startDate) {
      throw new AppError('This coupon promotion has not started yet', 400, 'COUPON_NOT_STARTED');
    }

    // 3. Customer Role Eligibility Check
    if (coupon.eligibleRoles && coupon.eligibleRoles.trim()) {
      const allowed = coupon.eligibleRoles.split(',').map((r) => r.trim());
      if (!allowed.includes(user.role)) {
        throw new AppError(
          `This coupon is exclusively reserved for roles: [${allowed.join(', ')}]`,
          403,
          'ROLE_NOT_ELIGIBLE'
        );
      }
    }

    // 4. Minimum order value check
    const minOrderVal = Number(coupon.minOrderValue);
    if (subtotal < minOrderVal) {
      throw new AppError(
        `Minimum order amount of $${minOrderVal.toFixed(2)} required for coupon. Your subtotal is $${Number(subtotal).toFixed(2)}`,
        400,
        'MIN_ORDER_NOT_MET'
      );
    }

    // 5. Total usage limit check
    if (coupon.usageLimitTotal !== null && coupon._count.usages >= coupon.usageLimitTotal) {
      throw new AppError('This coupon has reached its maximum global usage limit', 400, 'COUPON_LIMIT_REACHED');
    }

    // 6. Usage limit per user check
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId: user.id,
      },
    });

    if (userUsageCount >= coupon.usageLimitPerUser) {
      throw new AppError(
        `You have already redeemed this coupon the maximum allowed times (${coupon.usageLimitPerUser} time(s)).`,
        400,
        'USER_LIMIT_REACHED'
      );
    }

    // 7. Calculate discount
    let discount = 0;
    const discountVal = Number(coupon.discountValue);
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * discountVal) / 100;
      if (coupon.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discount = discountVal;
    }

    discount = Math.min(discount, subtotal);
    discount = parseFloat(discount.toFixed(2));

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: discountVal,
        description: coupon.description,
      },
      discountAmount: discount,
      finalTotal: parseFloat((subtotal - discount).toFixed(2)),
    };
  }

  static async getAllCoupons() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } },
      },
    });
  }

  static async createCoupon(data) {
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new AppError('Coupon code already exists', 409, 'COUPON_CODE_EXISTS');
    }

    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType || 'PERCENTAGE',
        discountValue: Number(data.discountValue),
        minOrderValue: Number(data.minOrderValue || 0),
        maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
        startDate: data.startDate || data.startsAt ? new Date(data.startDate || data.startsAt) : new Date(),
        expiryDate: new Date(data.expiryDate || data.expiresAt),
        usageLimitTotal: data.usageLimitTotal ? parseInt(data.usageLimitTotal, 10) : null,
        usageLimitPerUser: data.usageLimitPerUser ? parseInt(data.usageLimitPerUser, 10) : 1,
        eligibleRoles: data.eligibleRoles,
      },
    });
  }
}

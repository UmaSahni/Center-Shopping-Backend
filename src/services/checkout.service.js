import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { emitOrderStatusUpdate } from '../sockets/order.socket.js';
import { v4 as uuidv4 } from 'uuid';

export class CheckoutService {
  /**
   * Concurrency-safe, transactional checkout with stock locking,
   * product & coupon expiry checks, and idempotency guarantees.
   */
  static async processCheckout(user, payload) {
    const {
      items,
      couponCode,
      shippingAddress,
      paymentMethod = 'CARD',
      idempotencyKey = uuidv4(),
      simulatePaymentFailure = false,
    } = payload;

    let checkoutItems = items;
    if (!checkoutItems || !Array.isArray(checkoutItems) || checkoutItems.length === 0) {
      const userCart = await prisma.cart.findUnique({
        where: { userId: user.id },
        include: { items: true },
      });
      if (userCart && userCart.items?.length > 0) {
        checkoutItems = userCart.items.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
        }));
      }
    }

    if (!checkoutItems || !Array.isArray(checkoutItems) || checkoutItems.length === 0) {
      throw new AppError('Cart or checkout items list is empty', 400, 'EMPTY_CHECKOUT');
    }

    if (!shippingAddress || !shippingAddress.trim()) {
      throw new AppError('Shipping address is required', 400, 'SHIPPING_ADDRESS_REQUIRED');
    }

    // 1. Idempotency Check: Prevent duplicate payment and order processing
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: {
        items: true,
        payment: true,
      },
    });

    if (existingOrder) {
      console.log(`⚡ [Idempotency] Returning existing order for idempotencyKey: ${idempotencyKey}`);
      return {
        order: existingOrder,
        isDuplicatePrevented: true,
      };
    }

    // 2. Simulate Payment Failure Scenario (Critical Scenario: Payment failure handling)
    if (simulatePaymentFailure) {
      throw new AppError(
        'Payment authorization failed from payment gateway. No funds were charged, and no stock was deducted.',
        402,
        'PAYMENT_FAILED'
      );
    }

    // 3. Execute Concurrency-Safe Transaction
    const result = await prisma.$transaction(
      async (tx) => {
        let subtotal = 0;
        const processedItems = [];

        // Step A: Validate and atomically lock/decrement stock for each item
        for (const item of checkoutItems) {
          const qty = parseInt(item.quantity, 10);
          if (isNaN(qty) || qty <= 0) {
            throw new AppError('Invalid item quantity', 400, 'INVALID_QUANTITY');
          }

          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true },
          });

          if (!variant) {
            throw new AppError(`Item variant ${item.variantId} not found`, 404, 'VARIANT_NOT_FOUND');
          }

          // Check product expiration date during checkout
          if (variant.product.expiryDate && new Date(variant.product.expiryDate) <= new Date()) {
            throw new AppError(
              `The product "${variant.product.title}" has expired and cannot be purchased.`,
              400,
              'PRODUCT_EXPIRED'
            );
          }

          // ATOMIC CONDITIONAL UPDATE:
          // If 2 customers attempt to buy the last available item simultaneously:
          // The first transaction updates the row (stockQuantity becomes 0, affectedRows = 1).
          // The second transaction finds stockQuantity >= 1 false (affectedRows = 0) and immediately fails!
          const affectedRows = await tx.$executeRaw`
            UPDATE ProductVariant
            SET stockQuantity = stockQuantity - ${qty}
            WHERE id = ${item.variantId} AND stockQuantity >= ${qty}
          `;

          if (affectedRows === 0) {
            throw new AppError(
              `Item "${variant.product.title}" is currently out of stock or requested quantity exceeds available stock.`,
              409,
              'OUT_OF_STOCK_CONFLICT'
            );
          }

          const price = Number(variant.price);
          const itemTotal = price * qty;
          subtotal += itemTotal;

          processedItems.push({
            variantId: variant.id,
            productTitle: variant.product.title,
            variantTitle: variant.title,
            price,
            quantity: qty,
            subtotal: itemTotal,
          });
        }

        // Step B: Validate Coupon during checkout (Atomic Re-validation)
        let discountAmount = 0;
        let appliedCouponId = null;

        if (couponCode && couponCode.trim()) {
          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode.trim().toUpperCase() },
            include: {
              _count: { select: { usages: true } },
            },
          });

          if (!coupon || !coupon.isActive) {
            throw new AppError('Coupon is invalid or inactive', 400, 'COUPON_INVALID');
          }

          const now = new Date();
          // Critical Scenario: Coupon expiry during checkout
          if (now > coupon.expiryDate) {
            throw new AppError('Coupon has expired during the checkout process', 400, 'COUPON_EXPIRED');
          }

          if (now < coupon.startDate) {
            throw new AppError('Coupon promotion has not started yet', 400, 'COUPON_NOT_STARTED');
          }

          if (coupon.eligibleRoles && coupon.eligibleRoles.trim()) {
            const allowed = coupon.eligibleRoles.split(',').map((r) => r.trim());
            if (!allowed.includes(user.role)) {
              throw new AppError('User role is not eligible for this coupon', 403, 'ROLE_NOT_ELIGIBLE');
            }
          }

          const minOrderVal = Number(coupon.minOrderValue);
          if (subtotal < minOrderVal) {
            throw new AppError(
              `Minimum order amount of $${minOrderVal.toFixed(2)} required for coupon ${coupon.code}`,
              400,
              'MIN_ORDER_NOT_MET'
            );
          }

          if (coupon.usageLimitTotal !== null && coupon._count.usages >= coupon.usageLimitTotal) {
            throw new AppError('Coupon has exceeded its maximum global redemption limit', 400, 'COUPON_LIMIT_REACHED');
          }

          const userUsageCount = await tx.couponUsage.count({
            where: { couponId: coupon.id, userId: user.id },
          });

          if (userUsageCount >= coupon.usageLimitPerUser) {
            throw new AppError(
              `You have already reached the maximum redemption limit for coupon ${coupon.code}`,
              400,
              'USER_LIMIT_REACHED'
            );
          }

          const discountVal = Number(coupon.discountValue);
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (subtotal * discountVal) / 100;
            if (coupon.maxDiscountAmount !== null) {
              discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
            }
          } else {
            discountAmount = discountVal;
          }
          discountAmount = Math.min(discountAmount, subtotal);
          appliedCouponId = coupon.id;
        }

        const shippingFee = 0;
        const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

        // Step C: Generate unique order number
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomHex = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `ORD-${dateStr}-${randomHex}`;

        // Step D: Create Order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            status: 'CONFIRMED',
            subtotal,
            discountAmount,
            shippingFee,
            totalAmount,
            shippingAddress,
            idempotencyKey,
            couponId: appliedCouponId,
            items: {
              create: processedItems.map((item) => ({
                variantId: item.variantId,
                productTitle: item.productTitle,
                variantTitle: item.variantTitle,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.subtotal,
              })),
            },
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                notes: 'Order placed and payment successfully confirmed.',
                changedById: user.id,
              },
            },
          },
          include: {
            items: true,
          },
        });

        // Step E: Record Coupon Usage
        if (appliedCouponId) {
          await tx.couponUsage.create({
            data: {
              couponId: appliedCouponId,
              userId: user.id,
              orderId: order.id,
              discountApplied: discountAmount,
            },
          });
        }

        // Step F: Record Payment
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            transactionId: `TXN-${uuidv4().substring(0, 12).toUpperCase()}`,
            paymentMethod,
            amount: totalAmount,
            status: 'SUCCESS',
            idempotencyKey: `PAY-${idempotencyKey}`,
            paymentDate: new Date(),
          },
        });

        // Step G: Clear user's cart
        const userCart = await tx.cart.findUnique({ where: { userId: user.id } });
        if (userCart) {
          await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
        }

        return { order, payment };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    // Broadcast real-time order creation event via Socket.io
    emitOrderStatusUpdate(result.order.id, {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      notes: 'Order placed and payment confirmed',
      updatedAt: result.order.createdAt,
      userId: user.id,
    });

    return result;
  }
}

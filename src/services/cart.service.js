import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';

export class CartService {
  static async getOrCreateCart(userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
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
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
        },
      });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.variant.price) * item.quantity;
    }, 0);

    return {
      ...cart,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  static async addItem(userId, variantId, quantity = 1) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError('Quantity must be at least 1', 400, 'INVALID_QUANTITY');
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      throw new AppError('Product variant not found', 404, 'VARIANT_NOT_FOUND');
    }

    if (variant.product.expiryDate && new Date(variant.product.expiryDate) <= new Date()) {
      throw new AppError('This product has expired and can no longer be added to cart', 400, 'PRODUCT_EXPIRED');
    }

    if (variant.stockQuantity < qty) {
      throw new AppError(
        `Insufficient stock. Only ${variant.stockQuantity} item(s) available.`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + qty;
      if (variant.stockQuantity < newQuantity) {
        throw new AppError(
          `Cannot add more. Max available stock is ${variant.stockQuantity}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: qty,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  static async updateQuantity(userId, cartItemId, quantity) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return this.removeItem(userId, cartItemId);
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        variant: true,
      },
    });

    if (!item || item.cart.userId !== userId) {
      throw new AppError('Cart item not found', 404, 'ITEM_NOT_FOUND');
    }

    if (item.variant.stockQuantity < qty) {
      throw new AppError(
        `Insufficient stock. Only ${item.variant.stockQuantity} item(s) available.`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: qty },
    });

    return this.getOrCreateCart(userId);
  }

  static async removeItem(userId, cartItemId) {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
      throw new AppError('Cart item not found', 404, 'ITEM_NOT_FOUND');
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getOrCreateCart(userId);
  }

  static async clearCart(userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
    return { success: true, message: 'Cart cleared' };
  }
}

import { CartService } from '../services/cart.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class CartController {
  static async getCart(req, res, next) {
    try {
      const cart = await CartService.getOrCreateCart(req.user.id);
      return sendSuccess(res, cart, 'Cart retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req, res, next) {
    try {
      const { variantId, quantity } = req.body;
      const cart = await CartService.addItem(req.user.id, variantId, quantity);
      return sendSuccess(res, cart, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  static async updateQuantity(req, res, next) {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;
      const cart = await CartService.updateQuantity(req.user.id, itemId, quantity);
      return sendSuccess(res, cart, 'Cart updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const cart = await CartService.removeItem(req.user.id, itemId);
      return sendSuccess(res, cart, 'Item removed from cart');
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req, res, next) {
    try {
      const result = await CartService.clearCart(req.user.id);
      return sendSuccess(res, result, 'Cart cleared');
    } catch (error) {
      next(error);
    }
  }
}

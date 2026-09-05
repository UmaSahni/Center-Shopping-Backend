import { CheckoutService } from '../services/checkout.service.js';
import { OrderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class OrderController {
  static async checkout(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

      const result = await CheckoutService.processCheckout(req.user, {
        ...req.body,
        idempotencyKey,
      });

      return sendSuccess(
        res,
        result,
        result.isDuplicatePrevented
          ? 'Idempotency match: Returning existing order'
          : 'Order placed successfully and payment confirmed',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req, res, next) {
    try {
      const { status, page, limit } = req.query;
      const result = await OrderService.getOrders(req.user, {
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      });

      return sendSuccess(res, result.orders, 'Orders retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req, res, next) {
    try {
      const order = await OrderService.getOrderById(req.params.id, req.user);
      return sendSuccess(res, order, 'Order details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await OrderService.updateOrderStatus(id, status, notes, req.user);
      return sendSuccess(res, updated, `Order status transitioned to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await OrderService.cancelOrder(id, reason, req.user);
      return sendSuccess(res, result, 'Order cancelled and refund processed successfully');
    } catch (error) {
      next(error);
    }
  }
}

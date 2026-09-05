import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

// Customer Checkout
router.post('/checkout', OrderController.checkout);

// Orders List & Single Order
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);

// Order Cancellation & Refund
router.post('/:id/cancel', OrderController.cancelOrder);

// Status update (Staff only: Admin & Sales Agent)
router.patch(
  '/:id/status',
  requireRole(['ADMIN', 'SALES_AGENT']),
  OrderController.updateStatus
);

export default router;

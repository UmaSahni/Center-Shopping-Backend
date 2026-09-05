import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

// Customer validate coupon
router.post('/validate', CouponController.validate);

// Admin & Sales Agent management
router.get('/', requireRole(['ADMIN', 'SALES_AGENT']), CouponController.getAllCoupons);
router.post('/', requireRole(['ADMIN']), CouponController.createCoupon);

export default router;

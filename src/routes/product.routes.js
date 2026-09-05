import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Public catalog routes
router.get('/', ProductController.getProducts);
router.get('/categories', ProductController.getCategories);
router.get('/slug/:slug', ProductController.getProductBySlug);
router.get('/:id', ProductController.getProductById);

// Protected Staff routes (Admin & Sales Agent)
router.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN', 'SALES_AGENT']),
  ProductController.createProduct
);

router.put(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SALES_AGENT']),
  ProductController.updateProduct
);

router.patch(
  '/variants/:variantId/stock',
  authMiddleware,
  requireRole(['ADMIN', 'SALES_AGENT']),
  ProductController.updateStock
);

export default router;

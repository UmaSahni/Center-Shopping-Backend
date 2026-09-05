import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', CartController.getCart);
router.post('/items', CartController.addItem);
router.put('/items/:itemId', CartController.updateQuantity);
router.delete('/items/:itemId', CartController.removeItem);
router.delete('/', CartController.clearCart);

export default router;

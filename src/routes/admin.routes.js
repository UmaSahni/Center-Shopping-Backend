import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['ADMIN', 'SALES_AGENT']));

router.get('/stats', AdminController.getStats);
router.get('/customers', AdminController.getCustomers);
router.get('/sales-agents', AdminController.getSalesAgents);
router.patch('/customers/:id/agent', AdminController.assignCustomerAgent);
router.post('/sales-agents', AdminController.createSalesAgent);

export default router;

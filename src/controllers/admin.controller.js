import { AdminService } from '../services/admin.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AdminController {
  static async getStats(req, res, next) {
    try {
      const stats = await AdminService.getDashboardStats();
      return sendSuccess(res, stats, 'Admin dashboard statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req, res, next) {
    try {
      const customers = await AdminService.getCustomers(req.query.search || '');
      return sendSuccess(res, customers, 'Customers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSalesAgents(req, res, next) {
    try {
      const agents = await AdminService.getSalesAgents();
      return sendSuccess(res, agents, 'Sales agents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async assignCustomerAgent(req, res, next) {
    try {
      const customer = await AdminService.assignCustomerAgent({
        customerId: req.params.id,
        salesAgentId: req.body.salesAgentId,
      });
      return sendSuccess(res, customer, 'Customer sales agent updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createSalesAgent(req, res, next) {
    try {
      const agent = await AdminService.createSalesAgent(req.body);
      return sendSuccess(res, agent, 'Sales agent created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

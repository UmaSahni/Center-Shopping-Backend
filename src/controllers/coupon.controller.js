import { CouponService } from '../services/coupon.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class CouponController {
  static async validate(req, res, next) {
    try {
      const { code, subtotal } = req.body;
      const result = await CouponService.validateCoupon(code, Number(subtotal), req.user);
      return sendSuccess(res, result, 'Coupon applied successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllCoupons(req, res, next) {
    try {
      const coupons = await CouponService.getAllCoupons();
      return sendSuccess(res, coupons, 'Coupons fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createCoupon(req, res, next) {
    try {
      const coupon = await CouponService.createCoupon(req.body);
      return sendSuccess(res, coupon, 'Coupon created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

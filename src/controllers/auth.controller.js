import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async googleAuth(req, res, next) {
    try {
      const result = await AuthService.googleAuth(req.body);
      return sendSuccess(res, result, 'Google authentication successful');
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      return sendSuccess(res, user, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

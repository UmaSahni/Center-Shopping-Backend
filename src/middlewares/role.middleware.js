import { AppError } from '../utils/appError.js';

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User not authenticated', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Requires one of roles [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

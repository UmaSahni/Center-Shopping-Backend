import { ENV } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected internal server error occurred';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let details = undefined;

  // Prisma Error Handling
  if (err.code === 'P2002') {
    statusCode = 409;
    errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
    const target = err.meta?.target || 'resource';
    message = `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    errorCode = 'RECORD_NOT_FOUND';
    message = 'The requested database record was not found.';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_VIOLATION';
    message = 'Foreign key constraint failed. Related record does not exist.';
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Malformed JSON payload in request body';
  }

  if (statusCode >= 500) {
    console.error('🔥 [Unhandled Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    details,
    ...(ENV.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

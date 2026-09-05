export function sendSuccess(res, data, message = 'Operation successful', statusCode = 200, meta = null) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

export function sendError(res, message = 'An error occurred', statusCode = 500, errorCode = 'ERROR', errorDetails = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    error: errorDetails,
  });
}

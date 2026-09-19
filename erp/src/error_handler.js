/**
 * Anvi Mitra ERP Standardized Error Handler
 */

function errorHandler(err, req, res, next) {
  console.error(`[API ERROR] ${req.method} ${req.url}:`, err.message || err);

  const status = Number(err.statusCode || err.status || (err.name === 'ValidationError' ? 400 : 500));
  const isProd = process.env.NODE_ENV === 'production';

  const response = {
    error: err.name || 'ApiError',
    message: err.message || 'An unexpected error occurred',
    statusCode: status,
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
  };

  if (!isProd && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = { errorHandler };

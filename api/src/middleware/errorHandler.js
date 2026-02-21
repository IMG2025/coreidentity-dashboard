const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error('unhandled_error', { message: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
};

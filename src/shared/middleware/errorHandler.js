const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Error]:', err.stack || err.message);

  if (err.isJoi) {
    const errors = err.details.map((detail) => ({
      field: detail.context.key,
      message: detail.message
    }));
    return errorResponse(res, 'Validation Error', 400, errors);
  }

  // Handle specific database errors (like unique constraint violation)
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Duplicate entry found', 409);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  errorResponse(res, message, statusCode);
};

module.exports = errorHandler;

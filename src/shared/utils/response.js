/**
 * Standard API response formatter
 */
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
}

function errorResponse(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const response = {
    status: 'error',
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} operation - The async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts
 * @param {number} options.baseDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {string} options.context - Context for logging
 * @param {Function} options.retryIf - Function that takes an error and returns boolean
 * @returns {Promise<any>}
 */
async function withRetry(operation, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 500,
    maxDelay = 5000,
    context = 'Operation',
    retryIf = () => true
  } = options;

  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !retryIf(error)) {
        throw error;
      }

      // Calculate exponential backoff with jitter
      const delay = Math.min(
        maxDelay,
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100
      );

      console.warn(`[${context}] Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms... Error: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

module.exports = {
  withRetry
};

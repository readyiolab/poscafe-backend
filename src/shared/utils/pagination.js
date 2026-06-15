/**
 * Standardize pagination parameters and generate SQL clauses
 * 
 * @param {Object} query - Express request query object
 * @returns {Object} - Pagination config and SQL fragments
 */
function getPaginationConfig(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(parseInt(query.limit, 10) || 10, 500));
  const allowedSorts = new Set(['id', 'created_at', 'updated_at', 'name', 'status', 'price', 'current_stock', 'table_number']);
  const requestedSort = query.sortBy || 'created_at';
  const sortBy = allowedSorts.has(requestedSort) ? requestedSort : 'created_at';
  const order = (query.order && query.order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
  
  const offset = (page - 1) * limit;
  
  const limitOffsetSql = `LIMIT ${limit} OFFSET ${offset}`;
  const orderBySql = `ORDER BY ${sortBy} ${order}`;
  
  return {
    page,
    limit,
    sortBy,
    order,
    offset,
    sql: `${orderBySql} ${limitOffsetSql}`
  };
}

/**
 * Format standard paginated response
 * 
 * @param {Array} data - Database results
 * @param {number} total - Total record count
 * @param {Object} config - Pagination config from getPaginationConfig
 * @returns {Object} - Formatted response
 */
function formatPaginatedResponse(data, total, config) {
  const totalPages = Math.ceil(total / config.limit);
  
  return {
    data,
    meta: {
      total,
      page: config.page,
      limit: config.limit,
      totalPages
    }
  };
}

module.exports = {
  getPaginationConfig,
  formatPaginatedResponse
};

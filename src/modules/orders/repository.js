const db = require('../../shared/config/database');

class OrdersRepository {
  async countOrders(where = '', params = []) {
    return db.count('tbl_orders', where, params);
  }

  async findOrders(limitOffsetSql, where = '', params = []) {
    const sql = `SELECT * FROM tbl_orders ${where ? 'WHERE ' + where : ''} ${limitOffsetSql}`;
    return db.queryAll(sql, params);
  }

  async findOrderById(id) {
    return db.select('tbl_orders', '*', 'id = ?', [id]);
  }

  async findOrderItems(orderId) {
    const sql = `
      SELECT 
        oi.*,
        mi.name,
        mi.price AS menu_price,
        (oi.quantity * oi.price) AS line_total
      FROM tbl_order_items oi
      JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `;
    return db.queryAll(sql, [orderId]);
  }

  /** Batch-load line items for many orders (avoids N+1 queries on list endpoints). */
  async findOrderItemsForOrderIds(orderIds) {
    if (!orderIds || !Array.isArray(orderIds) || !orderIds.length) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        oi.*,
        mi.name,
        mi.price AS menu_price,
        (oi.quantity * oi.price) AS line_total
      FROM tbl_order_items oi
      JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id IN (${placeholders})
    `;
    return db.queryAll(sql, orderIds);
  }

  async updateOrderStatus(id, status) {
    return db.update('tbl_orders', { status }, 'id = ?', [id]);
  }
}

module.exports = new OrdersRepository();

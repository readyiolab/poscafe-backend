const db = require('../../shared/config/database');

class BillingRepository {
  async findUnpaidOrdersByTable(tableId) {
    const sql = `
      SELECT o.* 
      FROM tbl_orders o
      LEFT JOIN tbl_transactions t ON o.id = t.order_id
      WHERE o.table_id = ? AND o.status IN ('Pending', 'Preparing', 'Ready', 'Completed') AND t.id IS NULL
    `;
    return db.queryAll(sql, [tableId]);
  }

  async createTransaction(data) {
    return db.insert('tbl_transactions', data);
  }
}

module.exports = new BillingRepository();

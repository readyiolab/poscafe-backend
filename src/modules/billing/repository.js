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

  async findActiveSessionByTable(tableId) {
    return db.select(
      'tbl_table_billing_sessions',
      '*',
      'table_id = ? AND status = ?',
      [tableId, 'active']
    );
  }

  async createSession(tableId) {
    return db.insert('tbl_table_billing_sessions', { table_id: tableId, status: 'active' });
  }

  async updateSession(id, data) {
    return db.update('tbl_table_billing_sessions', data, 'id = ?', [id]);
  }

  async closeActiveSessionsForTable(tableId) {
    return db.query(
      'UPDATE tbl_table_billing_sessions SET status = ? WHERE table_id = ? AND status = ?',
      ['closed', tableId, 'active']
    );
  }

  async findActiveSessionsWithTableInfo() {
    const sql = `
      SELECT s.*, t.table_number
      FROM tbl_table_billing_sessions s
      JOIN tbl_tables t ON s.table_id = t.id
      WHERE s.status = 'active' AND s.bill_requested_at IS NOT NULL
      ORDER BY s.bill_requested_at DESC
    `;
    return db.queryAll(sql);
  }
}

module.exports = new BillingRepository();

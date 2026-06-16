const db = require('../../shared/config/database');

class LoyaltyRepository {
  async getSettings() {
    return db.select('tbl_loyalty_settings', '*', 'id = 1', []);
  }

  async updateSettings(data) {
    return db.update('tbl_loyalty_settings', data, 'id = 1', []);
  }

  async findRewards(activeOnly = false) {
    const where = activeOnly ? 'active = 1' : '';
    return db.selectAll('tbl_loyalty_rewards', '*', where, [], 'ORDER BY sort_order ASC, id ASC');
  }

  async findRewardById(id) {
    return db.select('tbl_loyalty_rewards', '*', 'id = ?', [id]);
  }

  async createReward(data) {
    return db.insert('tbl_loyalty_rewards', data);
  }

  async updateReward(id, data) {
    return db.update('tbl_loyalty_rewards', data, 'id = ?', [id]);
  }

  async deleteReward(id) {
    return db.delete('tbl_loyalty_rewards', 'id = ?', [id]);
  }

  async findCustomerById(id) {
    return db.select('tbl_customers', '*', 'id = ?', [id]);
  }

  async findCustomerByPhone(phone) {
    return db.select('tbl_customers', '*', 'phone = ?', [phone]);
  }

  async createCustomer(phone) {
    return db.insert('tbl_customers', { phone });
  }

  async updateCustomer(id, data) {
    return db.update('tbl_customers', data, 'id = ?', [id]);
  }

  async addLedgerEntry(connection, entry) {
    const exec = connection ? connection.execute.bind(connection) : db.pool.execute.bind(db.pool);
    const [result] = await exec(
      `INSERT INTO tbl_loyalty_ledger (customer_id, type, points, balance_after, order_id, transaction_id, reward_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.customer_id,
        entry.type,
        entry.points,
        entry.balance_after,
        entry.order_id || null,
        entry.transaction_id || null,
        entry.reward_id || null,
        entry.note || null,
      ]
    );
    return result;
  }

  async createCoupon(data) {
    return db.insert('tbl_loyalty_coupons', data);
  }

  async findCouponByCode(code) {
    const sql = `
      SELECT c.*, r.name as reward_name, r.menu_item_id, m.name as menu_item_name, m.price as menu_item_price
      FROM tbl_loyalty_coupons c
      JOIN tbl_loyalty_rewards r ON c.reward_id = r.id
      LEFT JOIN tbl_menu_items m ON r.menu_item_id = m.id
      WHERE c.code = ?
    `;
    const rows = await db.queryAll(sql, [code]);
    return rows[0] || null;
  }

  async findActiveCouponsByCustomer(customerId) {
    const sql = `
      SELECT c.*, r.name as reward_name, r.menu_item_id, r.valid_days, r.tier
      FROM tbl_loyalty_coupons c
      JOIN tbl_loyalty_rewards r ON c.reward_id = r.id
      WHERE c.customer_id = ? AND c.status = 'active' AND c.expires_at > NOW()
      ORDER BY c.expires_at ASC
    `;
    return db.queryAll(sql, [customerId]);
  }

  async markCouponUsed(id, orderId) {
    return db.query(
      'UPDATE tbl_loyalty_coupons SET status = ?, used_at = NOW(), used_order_id = ? WHERE id = ?',
      ['used', orderId, id]
    );
  }

  async expireCouponsForCustomer(customerId) {
    const sql = `
      SELECT * FROM tbl_loyalty_coupons
      WHERE customer_id = ? AND status = 'active' AND expires_at <= NOW()
    `;
    return db.queryAll(sql, [customerId]);
  }

  async markCouponExpired(id) {
    return db.query('UPDATE tbl_loyalty_coupons SET status = ? WHERE id = ?', ['expired', id]);
  }

  async getLedger(customerId, limit = 20) {
    return db.queryAll(
      'SELECT * FROM tbl_loyalty_ledger WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?',
      [customerId, limit]
    );
  }

  async getCustomerOrders(customerId, limit = 10) {
    const sql = `
      SELECT o.*, t.table_number
      FROM tbl_orders o
      LEFT JOIN tbl_tables t ON o.table_id = t.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    return db.queryAll(sql, [customerId, limit]);
  }

  async createServiceRequest(tableId, type) {
    return db.insert('tbl_table_service_requests', { table_id: tableId, type, status: 'pending' });
  }

  async findRecentServiceRequest(tableId, type, minutes = 2) {
    const sql = `
      SELECT * FROM tbl_table_service_requests
      WHERE table_id = ? AND type = ? AND status = 'pending'
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY created_at DESC LIMIT 1
    `;
    const rows = await db.queryAll(sql, [tableId, type, minutes]);
    return rows[0] || null;
  }

  async getPendingServiceRequests() {
    const sql = `
      SELECT r.*, t.table_number
      FROM tbl_table_service_requests r
      JOIN tbl_tables t ON r.table_id = t.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `;
    return db.queryAll(sql);
  }

  async resolveServiceRequest(id) {
    return db.query(
      'UPDATE tbl_table_service_requests SET status = ?, resolved_at = NOW() WHERE id = ?',
      ['done', id]
    );
  }

  async findServiceRequestById(id) {
    const sql = `
      SELECT r.*, t.table_number
      FROM tbl_table_service_requests r
      JOIN tbl_tables t ON r.table_id = t.id
      WHERE r.id = ?
    `;
    const rows = await db.queryAll(sql, [id]);
    return rows[0] || null;
  }
}

module.exports = new LoyaltyRepository();

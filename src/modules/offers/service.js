const db = require('../../shared/config/database');

class OffersService {
  async getOffers() {
    const sql = `
      SELECT o.*, m.name as menu_item_name, m.price as original_price 
      FROM tbl_offers o 
      LEFT JOIN tbl_menu_items m ON o.menu_item_id = m.id 
      WHERE o.status = 'active'
      ORDER BY o.created_at DESC
    `;
    return db.queryAll(sql);
  }

  async getAllOffersAdmin() {
    const sql = `
      SELECT o.*, m.name as menu_item_name 
      FROM tbl_offers o 
      LEFT JOIN tbl_menu_items m ON o.menu_item_id = m.id 
      ORDER BY o.created_at DESC
    `;
    return db.queryAll(sql);
  }

  async createOffer(data) {
    const result = await db.insert('tbl_offers', data);
    return { id: result.insertId, ...data };
  }

  async updateOffer(id, data) {
    await db.update('tbl_offers', data, 'id = ?', [id]);
    return { id, ...data };
  }

  async deleteOffer(id) {
    return db.delete('tbl_offers', 'id = ?', [id]);
  }
}

module.exports = new OffersService();

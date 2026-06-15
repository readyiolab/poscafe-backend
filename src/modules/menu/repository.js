const db = require('../../shared/config/database');

class MenuRepository {
  async countMenu(where = '', params = []) {
    return db.count('tbl_menu_items m', where, params);
  }

  async findMenu(limitOffsetSql, where = '', params = []) {
    const sql = `
      SELECT m.*, c.name as category_name, 
             (SELECT COUNT(*) FROM tbl_recipes r WHERE r.menu_item_id = m.id) as recipe_count,
             (SELECT COALESCE(SUM(r.quantity_used * i.unit_price), 0) 
              FROM tbl_recipes r 
              JOIN tbl_inventory i ON r.inventory_id = i.id 
              WHERE r.menu_item_id = m.id) as recipe_cost
      FROM tbl_menu_items m
      LEFT JOIN tbl_categories c ON m.category_id = c.id
      ${where ? 'WHERE ' + where : ''} 
      ${limitOffsetSql}
    `;
    return db.queryAll(sql, params);
  }

  async createMenuItem(data) {
    return db.insert('tbl_menu_items', data);
  }

  async updateMenuItem(id, data) {
    return db.update('tbl_menu_items', data, 'id = ?', [id]);
  }

  async deleteMenuItem(id) {
    return db.delete('tbl_menu_items', 'id = ?', [id]);
  }
}

module.exports = new MenuRepository();

const db = require('../../shared/config/database');

class InventoryRepository {
  async countInventory(where = '', params = []) {
    return db.count('tbl_inventory', where, params);
  }

  async findInventory(limitOffsetSql, where = '', params = []) {
    const sql = `
      SELECT i.*, 
             (SELECT COUNT(*) FROM tbl_recipes r WHERE r.inventory_id = i.id) as usage_count
      FROM tbl_inventory i 
      ${where ? 'WHERE ' + where : ''} 
      ${limitOffsetSql}
    `;
    return db.queryAll(sql, params);
  }

  async findInventoryById(id) {
    return db.select('tbl_inventory', '*', 'id = ?', [id]);
  }

  async createInventory(data) {
    return db.insert('tbl_inventory', data);
  }

  async updateInventory(id, data) {
    return db.update('tbl_inventory', data, 'id = ?', [id]);
  }

  async deleteInventory(id) {
    return db.delete('tbl_inventory', 'id = ?', [id]);
  }

  async updateStock(id, stockToAdd) {
    const sql = `UPDATE tbl_inventory SET current_stock = current_stock + ? WHERE id = ?`;
    await db.query(sql, [stockToAdd, id]);
    return this.findInventoryById(id);
  }

  async findIngredientUsage(id) {
    const sql = `
      SELECT m.id, m.name, r.quantity_used, i.unit
      FROM tbl_recipes r
      JOIN tbl_menu_items m ON r.menu_item_id = m.id
      JOIN tbl_inventory i ON r.inventory_id = i.id
      WHERE r.inventory_id = ?
    `;
    return db.queryAll(sql, [id]);
  }
}

module.exports = new InventoryRepository();

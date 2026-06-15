const db = require('../../shared/config/database');

class RecipesRepository {
  async findRecipesByMenuItem(menuItemId) {
    const sql = `
      SELECT r.*, i.name as inventory_name, i.unit, i.unit_price 
      FROM tbl_recipes r
      JOIN tbl_inventory i ON r.inventory_id = i.id
      WHERE r.menu_item_id = ?
    `;
    return db.queryAll(sql, [menuItemId]);
  }

  async createRecipe(data) {
    return db.insert('tbl_recipes', data);
  }

  async deleteRecipe(id) {
    return db.delete('tbl_recipes', 'id = ?', [id]);
  }
}

module.exports = new RecipesRepository();

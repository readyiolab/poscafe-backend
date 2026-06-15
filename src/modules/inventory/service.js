const inventoryRepo = require('./repository');
const db = require('../../shared/config/database');
const appEvents = require('../../shared/utils/events');

class InventoryService {
  async getInventory(paginationConfig, search = '') {
    let where = '';
    let params = [];

    if (search) {
      where = 'name LIKE ?';
      params.push(`%${search}%`);
    }

    const total = await inventoryRepo.countInventory(where, params);
    const data = await inventoryRepo.findInventory(paginationConfig.sql, where, params);
    
    return { data, total };
  }

  async createInventoryItem(data) {
    const result = await inventoryRepo.createInventory(data);
    appEvents.emit('inventory_updated');
    return { id: result.insertId, ...data };
  }

  async refillStock(data) {
    const { inventory_id, quantity_added, unit_price } = data;
    const total_cost = quantity_added * unit_price;

    let connection;
    try {
      connection = await db.beginTransaction();

      // 1. Update stock and unit price atomically
      await connection.execute(
        'UPDATE tbl_inventory SET current_stock = current_stock + ?, unit_price = ? WHERE id = ?',
        [quantity_added, unit_price, inventory_id]
      );

      // 2. Log the refill
      await connection.execute(
        'INSERT INTO tbl_inventory_logs (inventory_id, quantity_added, unit_price, total_cost, type) VALUES (?, ?, ?, ?, ?)',
        [inventory_id, quantity_added, unit_price, total_cost, 'refill']
      );

      await db.commit(connection);
      
      appEvents.emit('inventory_updated');
      const updatedItem = await inventoryRepo.findInventoryById(inventory_id);
      return { ...updatedItem, last_refill_cost: total_cost };
    } catch (error) {
      if (connection) await db.rollback(connection);
      throw error;
    }
  }

  async updateStock(id, stockToAdd) {
    const sql = `UPDATE tbl_inventory SET current_stock = current_stock + ? WHERE id = ?`;
    await db.query(sql, [stockToAdd, id]);
    appEvents.emit('inventory_updated');
    return inventoryRepo.findInventoryById(id);
  }

  async updateInventoryItem(id, data) {
    await inventoryRepo.updateInventory(id, data);
    appEvents.emit('inventory_updated');
    return inventoryRepo.findInventoryById(id);
  }

  async getIngredientUsage(id) {
    return inventoryRepo.findIngredientUsage(id);
  }

  async getLowStockItems() {
    const sql = `SELECT * FROM tbl_inventory WHERE current_stock < 10 ORDER BY current_stock ASC`;
    return db.queryAll(sql);
  }

  async deleteInventoryItem(id) {
    const item = await inventoryRepo.findInventoryById(id);
    if (!item) {
      const err = new Error('Inventory item not found');
      err.statusCode = 404;
      throw err;
    }
    await inventoryRepo.deleteInventory(id);
    appEvents.emit('inventory_updated');
    return { id };
  }
}

module.exports = new InventoryService();

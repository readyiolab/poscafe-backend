const menuRepo = require('./repository');
const appEvents = require('../../shared/utils/events');

class MenuService {
  async getMenu(paginationConfig, categoryId = null) {
    let where = '';
    let params = [];

    if (categoryId) {
      where = 'm.category_id = ?';
      params.push(categoryId);
    }

    const total = await menuRepo.countMenu(where, params);
    const data = await menuRepo.findMenu(paginationConfig.sql, where, params);
    
    return { data, total };
  }

  async createMenuItem(data) {
    const result = await menuRepo.createMenuItem(data);
    appEvents.emit('menu_updated');
    return { id: result.insertId, ...data };
  }

  async updateMenuItem(id, data) {
    await menuRepo.updateMenuItem(id, data);
    appEvents.emit('menu_updated');
    return { id, ...data };
  }

  async deleteMenuItem(id) {
    await menuRepo.deleteMenuItem(id);
    appEvents.emit('menu_updated');
    return { id };
  }
}

module.exports = new MenuService();

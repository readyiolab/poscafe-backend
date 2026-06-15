const categoriesRepo = require('./repository');
const appEvents = require('../../shared/utils/events');

class CategoriesService {
  async getCategories(paginationConfig, search = '') {
    let where = '';
    let params = [];

    if (search) {
      where = 'name LIKE ?';
      params.push(`%${search}%`);
    }

    const total = await categoriesRepo.countCategories(where, params);
    const data = await categoriesRepo.findCategories(paginationConfig.sql, where, params);
    
    return { data, total };
  }

  async createCategory(data) {
    const result = await categoriesRepo.createCategory(data);
    appEvents.emit('categories_updated');
    return { id: result.insertId, ...data };
  }

  async updateCategory(id, data) {
    await categoriesRepo.updateCategory(id, data);
    appEvents.emit('categories_updated');
    return { id, ...data };
  }

  async deleteCategory(id) {
    await categoriesRepo.deleteCategory(id);
    appEvents.emit('categories_updated');
    return { id };
  }
}

module.exports = new CategoriesService();

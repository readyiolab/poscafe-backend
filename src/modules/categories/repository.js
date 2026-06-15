const db = require('../../shared/config/database');

class CategoriesRepository {
  async countCategories(where = '', params = []) {
    return db.count('tbl_categories', where, params);
  }

  async findCategories(limitOffsetSql, where = '', params = []) {
    const sql = `SELECT * FROM tbl_categories ${where ? 'WHERE ' + where : ''} ${limitOffsetSql}`;
    return db.queryAll(sql, params);
  }

  async createCategory(data) {
    return db.insert('tbl_categories', data);
  }

  async updateCategory(id, data) {
    return db.update('tbl_categories', data, 'id = ?', [id]);
  }

  async deleteCategory(id) {
    return db.delete('tbl_categories', 'id = ?', [id]);
  }
}

module.exports = new CategoriesRepository();

const db = require('../../shared/config/database');

class TablesRepository {
  async countTables(where = '', params = []) {
    return db.count('tbl_tables', where, params);
  }

  async findTables(limitOffsetSql, where = '', params = []) {
    const sql = `SELECT * FROM tbl_tables ${where ? 'WHERE ' + where : ''} ${limitOffsetSql}`;
    return db.queryAll(sql, params);
  }

  async findTableById(id) {
    return db.select('tbl_tables', '*', 'id = ?', [id]);
  }

  async findTableByToken(token) {
    return db.select('tbl_tables', '*', 'qr_token = ?', [token]);
  }

  async findTableByNumber(tableNumber) {
    return db.select('tbl_tables', '*', 'table_number = ?', [tableNumber]);
  }

  async createTable(data) {
    return db.insert('tbl_tables', data);
  }

  async updateTable(id, data) {
    return db.update('tbl_tables', data, 'id = ?', [id]);
  }

  async deleteTable(id) {
    return db.delete('tbl_tables', 'id = ?', [id]);
  }
}

module.exports = new TablesRepository();

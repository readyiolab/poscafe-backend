const db = require('../../shared/config/database');

class UsersRepository {
  async countUsers(where = '', params = []) {
    return db.count('tbl_users', where, params);
  }

  async findUsers(limitOffsetSql, where = '', params = []) {
    const sql = `SELECT id, username, role, created_at, updated_at FROM tbl_users ${where ? 'WHERE ' + where : ''} ${limitOffsetSql}`;
    return db.queryAll(sql, params);
  }

  async findUserById(id) {
    return db.select('tbl_users', 'id, username, role, created_at, updated_at', 'id = ?', [id]);
  }

  async updateUser(id, data) {
    return db.update('tbl_users', data, 'id = ?', [id]);
  }

  async deleteUser(id) {
    return db.delete('tbl_users', 'id = ?', [id]);
  }
}

module.exports = new UsersRepository();

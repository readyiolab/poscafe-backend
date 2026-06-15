const db = require('../../shared/config/database');

class AuthRepository {
  async findUserByUsername(username) {
    return db.select('tbl_users', '*', 'username = ?', [username]);
  }

  async createUser(userData) {
    return db.insert('tbl_users', userData);
  }
}

module.exports = new AuthRepository();

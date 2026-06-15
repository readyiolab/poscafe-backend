const usersRepo = require('./repository');
const bcrypt = require('bcrypt');

class UsersService {
  async getUsers(paginationConfig, search = '') {
    let where = '';
    let params = [];

    if (search) {
      where = 'username LIKE ?';
      params.push(`%${search}%`);
    }

    const total = await usersRepo.countUsers(where, params);
    const data = await usersRepo.findUsers(paginationConfig.sql, where, params);
    
    return { data, total };
  }

  async updateUser(id, data) {
    const updateData = { ...data };
    
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(data.password, salt);
      delete updateData.password;
    }

    await usersRepo.updateUser(id, updateData);
    return usersRepo.findUserById(id);
  }

  async deleteUser(id) {
    await usersRepo.deleteUser(id);
    return { id };
  }
}

module.exports = new UsersService();

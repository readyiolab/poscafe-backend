const db = require('../../shared/config/database');

class CustomersRepository {
  async findCustomerByPhone(phone) {
    return db.select('tbl_customers', '*', 'phone = ?', [phone]);
  }

  async createCustomer(phone) {
    return db.insert('tbl_customers', { phone });
  }
}

module.exports = new CustomersRepository();

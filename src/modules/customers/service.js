const customersRepo = require('./repository');

class CustomersService {
  async saveCustomerPhone(phone) {
    if (!phone || typeof phone !== 'string' || !/^\d{10,15}$/.test(phone)) {
      throw { statusCode: 400, message: 'Invalid phone number format. Please enter a valid number.' };
    }

    const existing = await customersRepo.findCustomerByPhone(phone);
    if (existing) {
      return { message: 'Customer already registered for marketing.', phone };
    }

    await customersRepo.createCustomer(phone);
    return { message: 'Customer phone registered successfully.', phone };
  }
}

module.exports = new CustomersService();

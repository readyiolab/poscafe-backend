const Joi = require('joi');
const customersService = require('./service');
const loyaltyService = require('../loyalty/service');
const { successResponse } = require('../../shared/utils/response');

const savePhoneSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number must be between 10 to 15 digits.'
  })
});

class CustomersController {
  async saveCustomerPhone(req, res, next) {
    try {
      const { error, value } = savePhoneSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await customersService.saveCustomerPhone(value.phone);
      return successResponse(res, result, 'Phone saved successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const phone = req.query.phone;
      if (!phone || !/^\d{10,15}$/.test(phone)) {
        throw { statusCode: 400, message: 'Valid phone query parameter is required' };
      }
      const data = await loyaltyService.getProfile(phone);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomersController();

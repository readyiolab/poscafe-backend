const Joi = require('joi');

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  role: Joi.string().valid('admin', 'manager', 'staff'),
  password: Joi.string().min(6).optional()
});

module.exports = {
  updateUserSchema
};

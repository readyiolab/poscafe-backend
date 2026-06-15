const Joi = require('joi');

const tableSchema = Joi.object({
  table_number: Joi.string().required(),
  status: Joi.string().valid('available', 'occupied', 'reserved').default('available'),
  capacity: Joi.number().integer().min(1).optional()
});

module.exports = {
  tableSchema
};

const Joi = require('joi');

const payBillSchema = Joi.object({
  table_id: Joi.number().integer().required(),
  payment_method: Joi.string().valid('cash', 'card', 'upi', 'card/upi').required()
});

module.exports = {
  payBillSchema
};

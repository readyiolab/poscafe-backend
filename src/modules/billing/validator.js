const Joi = require('joi');

const payBillSchema = Joi.object({
  table_id: Joi.number().integer().required(),
  payment_method: Joi.string().valid('cash', 'card', 'upi', 'card/upi').required(),
  customer_phone: Joi.string().pattern(/^\d{10,15}$/).allow('', null).optional(),
  coupon_code: Joi.string().allow('', null).optional(),
});

const tableTokenSchema = Joi.object({
  table_token: Joi.string().hex().length(32).required(),
});

const paymentPreferenceSchema = Joi.object({
  table_token: Joi.string().hex().length(32).required(),
  method: Joi.string().valid('cash', 'upi').required(),
});

const showBillSchema = Joi.object({
  table_id: Joi.number().integer().required(),
});

const hideBillSchema = Joi.object({
  table_id: Joi.number().integer().required(),
});

module.exports = {
  payBillSchema,
  tableTokenSchema,
  paymentPreferenceSchema,
  showBillSchema,
  hideBillSchema,
};

const Joi = require('joi');

const orderItemSchema = Joi.object({
  menu_item_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).default(1)
});

const createOrderSchema = Joi.object({
  table_token: Joi.string().hex().length(32).required(),
  items: Joi.array().items(orderItemSchema).min(1).required()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled').required()
});

const posCheckoutSchema = Joi.object({
  table_id: Joi.number().integer().required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  payment_method: Joi.string().valid('cash', 'card', 'upi', 'card/upi').required(),
  customer_name: Joi.string().allow('', null).optional(),
  customer_phone: Joi.string().allow('', null).optional(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  posCheckoutSchema,
};

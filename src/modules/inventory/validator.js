const Joi = require('joi');

const inventorySchema = Joi.object({
  name: Joi.string().required(),
  unit: Joi.string().valid('gm', 'kg', 'ml', 'ltr', 'pcs', 'pkt', 'box', 'can', 'bottle', 'dozen', 'set').required(),
  current_stock: Joi.number().min(0).default(0),
  unit_price: Joi.number().min(0).required()
});

const updateInventorySchema = Joi.object({
  name: Joi.string().optional(),
  unit: Joi.string().valid('gm', 'kg', 'ml', 'ltr', 'pcs', 'pkt', 'box', 'can', 'bottle', 'dozen', 'set').optional(),
  unit_price: Joi.number().min(0).optional()
});

const updateStockSchema = Joi.object({
  stock_to_add: Joi.number().required() // Can be negative to manually deduct
});

module.exports = {
  inventorySchema,
  updateInventorySchema,
  updateStockSchema
};

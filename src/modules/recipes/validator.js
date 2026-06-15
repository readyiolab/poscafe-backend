const Joi = require('joi');

const recipeSchema = Joi.object({
  menu_item_id: Joi.number().integer().required(),
  inventory_id: Joi.number().integer().required(),
  quantity_used: Joi.number().positive().required()
});

module.exports = {
  recipeSchema
};

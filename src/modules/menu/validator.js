const Joi = require('joi');

const menuSchema = Joi.object({
  category_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().required(),
  image_url: Joi.string().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'sold_out', 'available').default('available'),
  calories: Joi.alternatives().try(Joi.number().integer().min(0), Joi.valid('', null)).optional(),
});

module.exports = {
  menuSchema
};

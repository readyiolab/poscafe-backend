const Joi = require('joi');

const menuSchema = Joi.object({
  category_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().required(),
  image_url: Joi.string().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'sold_out', 'available').default('available')
});

module.exports = {
  menuSchema
};

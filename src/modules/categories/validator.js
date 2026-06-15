const Joi = require('joi');

const categorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null)
});

module.exports = {
  categorySchema
};

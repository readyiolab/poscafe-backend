const Joi = require('joi');

const settingsSchema = Joi.object({
  points_per_rupee: Joi.number().min(0).max(10),
  visit_bonus_points: Joi.number().integer().min(0).max(500),
  min_order_for_points: Joi.number().min(0),
  max_points_per_order: Joi.number().integer().min(1).max(10000),
  enabled: Joi.boolean(),
});

const rewardSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  description: Joi.string().allow('', null).max(255),
  menu_item_id: Joi.number().integer().allow(null),
  points_cost: Joi.number().integer().min(1).required(),
  tier: Joi.string().valid('small', 'medium', 'large'),
  valid_days: Joi.number().integer().min(1).max(365),
  active: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
});

const redeemSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10,15}$/).required(),
  reward_id: Joi.number().integer().required(),
});

const serviceRequestSchema = Joi.object({
  table_token: Joi.string().hex().length(32).required(),
  type: Joi.string().valid('waiter', 'bill').required(),
});

const applyCouponSchema = Joi.object({
  coupon_code: Joi.string().min(4).max(16).required(),
  customer_phone: Joi.string().pattern(/^\d{10,15}$/).allow(null, ''),
  order_id: Joi.number().integer().allow(null),
});

module.exports = {
  settingsSchema,
  rewardSchema,
  redeemSchema,
  serviceRequestSchema,
  applyCouponSchema,
};

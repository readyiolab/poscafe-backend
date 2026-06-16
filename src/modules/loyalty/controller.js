const loyaltyService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const {
  settingsSchema,
  rewardSchema,
  redeemSchema,
  serviceRequestSchema,
  applyCouponSchema,
} = require('./validator');

class LoyaltyController {
  async getSettings(req, res, next) {
    try {
      const data = await loyaltyService.getSettings();
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const { error, value } = settingsSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const payload = { ...value };
      if (typeof value.enabled === 'boolean') payload.enabled = value.enabled ? 1 : 0;
      const data = await loyaltyService.updateSettings(payload);
      return successResponse(res, data, 'Loyalty settings updated');
    } catch (err) {
      next(err);
    }
  }

  async listRewards(req, res, next) {
    try {
      const activeOnly = req.query.all !== '1';
      const data = await loyaltyService.listRewards(activeOnly);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async createReward(req, res, next) {
    try {
      const { error, value } = rewardSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const payload = { ...value, active: value.active !== false ? 1 : 0 };
      const data = await loyaltyService.createReward(payload);
      return successResponse(res, data, 'Reward created', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateReward(req, res, next) {
    try {
      const { error, value } = rewardSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const payload = { ...value };
      if (typeof value.active === 'boolean') payload.active = value.active ? 1 : 0;
      const data = await loyaltyService.updateReward(req.params.id, payload);
      return successResponse(res, data, 'Reward updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteReward(req, res, next) {
    try {
      await loyaltyService.deleteReward(req.params.id);
      return successResponse(res, null, 'Reward deleted');
    } catch (err) {
      next(err);
    }
  }

  async redeem(req, res, next) {
    try {
      const { error, value } = redeemSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const data = await loyaltyService.redeemReward(value.phone, value.reward_id);
      return successResponse(res, data, 'Reward claimed successfully');
    } catch (err) {
      next(err);
    }
  }

  async applyCoupon(req, res, next) {
    try {
      const { error, value } = applyCouponSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      await loyaltyService.validateCoupon(value.coupon_code, value.customer_phone || null);
      const data = await loyaltyService.applyCoupon(value.coupon_code, value.order_id || null);
      return successResponse(res, data, 'Coupon applied');
    } catch (err) {
      next(err);
    }
  }

  async createServiceRequest(req, res, next) {
    try {
      const { error, value } = serviceRequestSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const data = await loyaltyService.createServiceRequest(value.table_token, value.type);
      return successResponse(res, data, 'Request sent to staff');
    } catch (err) {
      next(err);
    }
  }

  async getPendingRequests(req, res, next) {
    try {
      const data = await loyaltyService.getPendingRequests();
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async resolveRequest(req, res, next) {
    try {
      const data = await loyaltyService.resolveRequest(req.params.id);
      return successResponse(res, data, 'Request marked as done');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LoyaltyController();

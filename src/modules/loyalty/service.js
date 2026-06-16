const crypto = require('crypto');
const loyaltyRepo = require('./repository');
const db = require('../../shared/config/database');
const appEvents = require('../../shared/utils/events');
const ordersRepo = require('../orders/repository');

function generateCouponCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

class LoyaltyService {
  isEnabled() {
    return process.env.LOYALTY_ENABLED !== 'false';
  }

  async getOrCreateCustomerByPhone(phone) {
    if (!phone || !/^\d{10,15}$/.test(phone)) return null;
    let customer = await loyaltyRepo.findCustomerByPhone(phone);
    if (!customer) {
      const result = await loyaltyRepo.createCustomer(phone);
      customer = await loyaltyRepo.findCustomerById(result.insertId);
    }
    return customer;
  }

  async processExpiredCoupons(customerId) {
    const expired = await loyaltyRepo.expireCouponsForCustomer(customerId);
    if (expired.length === 0) return;

    const customer = await loyaltyRepo.findCustomerById(customerId);
    if (!customer) return;

    let balance = customer.points_balance;
    for (const coupon of expired) {
      balance += coupon.points_spent;
      await loyaltyRepo.markCouponExpired(coupon.id);
      await loyaltyRepo.addLedgerEntry(null, {
        customer_id: customerId,
        type: 'expire_refund',
        points: coupon.points_spent,
        balance_after: balance,
        reward_id: coupon.reward_id,
        note: `Refund for expired coupon ${coupon.code}`,
      });
    }
    await loyaltyRepo.updateCustomer(customerId, { points_balance: balance });
    appEvents.emit('customer_points_updated', { customer_id: customerId, points_balance: balance });
  }

  async getProfile(phone) {
    const customer = await this.getOrCreateCustomerByPhone(phone);
    if (!customer) {
      throw { statusCode: 400, message: 'Invalid phone number' };
    }

    await this.processExpiredCoupons(customer.id);
    const refreshed = await loyaltyRepo.findCustomerById(customer.id);

    const [orders, coupons, ledger, settings] = await Promise.all([
      loyaltyRepo.getCustomerOrders(customer.id, 10),
      loyaltyRepo.findActiveCouponsByCustomer(customer.id),
      loyaltyRepo.getLedger(customer.id, 20),
      loyaltyRepo.getSettings(),
    ]);

    for (const order of orders) {
      order.items = await ordersRepo.findOrderItems(order.id);
    }

    return {
      customer: {
        id: refreshed.id,
        phone: refreshed.phone,
        points_balance: refreshed.points_balance,
        visit_count: refreshed.visit_count,
        lifetime_spend: refreshed.lifetime_spend,
        last_visit_at: refreshed.last_visit_at,
      },
      recent_orders: orders,
      active_coupons: coupons,
      points_ledger: ledger,
      settings: settings,
    };
  }

  calculatePoints(grandTotal, settings) {
    const minOrder = parseFloat(settings.min_order_for_points || 50);
    if (grandTotal < minOrder) return 0;

    const rate = parseFloat(settings.points_per_rupee || 0.1);
    const bonus = parseInt(settings.visit_bonus_points || 5, 10);
    const cap = parseInt(settings.max_points_per_order || 100, 10);

    let points = Math.floor(grandTotal * rate) + bonus;
    if (points > cap) points = cap;
    return points;
  }

  async earnOnPayment({ customerId, transactionId, orderId, grandTotal }) {
    if (!this.isEnabled() || !customerId) return null;

    const settings = await loyaltyRepo.getSettings();
    if (!settings?.enabled) return null;

    const [txRow] = await db.queryAll(
      'SELECT loyalty_points_earned FROM tbl_transactions WHERE id = ?',
      [transactionId]
    );
    if (txRow?.loyalty_points_earned > 0) return null;

    const points = this.calculatePoints(grandTotal, settings);
    if (points <= 0) return null;

    const customer = await loyaltyRepo.findCustomerById(customerId);
    if (!customer) return null;

    const newBalance = customer.points_balance + points;
    const newVisits = customer.visit_count + 1;
    const newSpend = parseFloat(customer.lifetime_spend) + grandTotal;

    await loyaltyRepo.updateCustomer(customerId, {
      points_balance: newBalance,
      visit_count: newVisits,
      lifetime_spend: newSpend,
      last_visit_at: new Date(),
    });

    await db.query(
      'UPDATE tbl_transactions SET customer_id = ?, loyalty_points_earned = ? WHERE id = ?',
      [customerId, points, transactionId]
    );

    await loyaltyRepo.addLedgerEntry(null, {
      customer_id: customerId,
      type: 'earn',
      points,
      balance_after: newBalance,
      order_id: orderId,
      transaction_id: transactionId,
      note: `Earned on payment of ₹${grandTotal.toFixed(2)}`,
    });

    appEvents.emit('customer_points_updated', { customer_id: customerId, points_balance: newBalance });
    return { points, balance: newBalance };
  }

  async redeemReward(phone, rewardId) {
    if (!this.isEnabled()) {
      throw { statusCode: 400, message: 'Loyalty program is currently disabled' };
    }

    const customer = await this.getOrCreateCustomerByPhone(phone);
    if (!customer) throw { statusCode: 400, message: 'Invalid phone number' };

    await this.processExpiredCoupons(customer.id);
    const refreshed = await loyaltyRepo.findCustomerById(customer.id);

    const reward = await loyaltyRepo.findRewardById(rewardId);
    if (!reward || !reward.active) {
      throw { statusCode: 404, message: 'Reward not found' };
    }

    if (refreshed.points_balance < reward.points_cost) {
      throw { statusCode: 400, message: 'Not enough points for this reward' };
    }

    const code = generateCouponCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + reward.valid_days);

    const newBalance = refreshed.points_balance - reward.points_cost;

    await loyaltyRepo.updateCustomer(customer.id, { points_balance: newBalance });

    const couponResult = await loyaltyRepo.createCoupon({
      customer_id: customer.id,
      reward_id: reward.id,
      code,
      points_spent: reward.points_cost,
      status: 'active',
      expires_at: expiresAt,
    });

    await loyaltyRepo.addLedgerEntry(null, {
      customer_id: customer.id,
      type: 'redeem',
      points: -reward.points_cost,
      balance_after: newBalance,
      reward_id: reward.id,
      note: `Redeemed: ${reward.name}`,
    });

    appEvents.emit('customer_points_updated', { customer_id: customer.id, points_balance: newBalance });

    return {
      coupon_id: couponResult.insertId,
      code,
      reward_name: reward.name,
      expires_at: expiresAt,
      valid_days: reward.valid_days,
      points_balance: newBalance,
    };
  }

  async validateCoupon(code, customerPhone = null) {
    const coupon = await loyaltyRepo.findCouponByCode(code);
    if (!coupon) throw { statusCode: 404, message: 'Invalid coupon code' };
    if (coupon.status !== 'active') throw { statusCode: 400, message: 'Coupon already used or expired' };
    if (new Date(coupon.expires_at) < new Date()) {
      throw { statusCode: 400, message: 'Coupon has expired' };
    }
    if (customerPhone) {
      const customer = await loyaltyRepo.findCustomerByPhone(customerPhone);
      if (!customer || customer.id !== coupon.customer_id) {
        throw { statusCode: 400, message: 'Coupon does not belong to this customer' };
      }
    }
    return coupon;
  }

  async applyCoupon(code, orderId = null) {
    const coupon = await this.validateCoupon(code);
    await loyaltyRepo.markCouponUsed(coupon.id, orderId);
    return coupon;
  }

  async createServiceRequest(tableToken, type) {
    if (type === 'bill') {
      throw { statusCode: 400, message: 'Use the billing request flow from the customer menu' };
    }

    const tablesRepo = require('../tables/repository');
    const table = await tablesRepo.findTableByToken(tableToken);
    if (!table) throw { statusCode: 404, message: 'Invalid table token' };

    const recent = await loyaltyRepo.findRecentServiceRequest(table.id, type, 2);
    if (recent) {
      throw { statusCode: 429, message: 'Request already sent. Please wait a moment.' };
    }

    const result = await loyaltyRepo.createServiceRequest(table.id, type);
    const payload = {
      request_id: result.insertId,
      table_id: table.id,
      table_number: table.table_number,
      type,
    };
    appEvents.emit('service_request', payload);
    return payload;
  }

  async getPendingRequests() {
    return loyaltyRepo.getPendingServiceRequests();
  }

  async resolveRequest(id) {
    const req = await loyaltyRepo.findServiceRequestById(id);
    if (!req) throw { statusCode: 404, message: 'Request not found' };
    await loyaltyRepo.resolveServiceRequest(id);
    appEvents.emit('service_request_resolved', { request_id: id, table_id: req.table_id });
    return { id, status: 'done' };
  }

  async getSettings() {
    return loyaltyRepo.getSettings();
  }

  async updateSettings(data) {
    await loyaltyRepo.updateSettings(data);
    return loyaltyRepo.getSettings();
  }

  async listRewards(activeOnly = false) {
    return loyaltyRepo.findRewards(activeOnly);
  }

  async createReward(data) {
    const result = await loyaltyRepo.createReward(data);
    return { id: result.insertId, ...data };
  }

  async updateReward(id, data) {
    await loyaltyRepo.updateReward(id, data);
    return loyaltyRepo.findRewardById(id);
  }

  async deleteReward(id) {
    await loyaltyRepo.deleteReward(id);
    return { id };
  }
}

module.exports = new LoyaltyService();

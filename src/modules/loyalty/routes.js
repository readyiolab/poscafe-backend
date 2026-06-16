const express = require('express');
const router = express.Router();
const loyaltyController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');

router.get('/rewards', loyaltyController.listRewards);
router.post('/redeem', apiLimiter, loyaltyController.redeem);
router.post('/service-request', apiLimiter, loyaltyController.createServiceRequest);

router.get('/settings', authenticate, authorize(['admin', 'manager']), loyaltyController.getSettings);
router.patch('/settings', authenticate, authorize(['admin']), loyaltyController.updateSettings);

router.post('/rewards', authenticate, authorize(['admin', 'manager']), loyaltyController.createReward);
router.patch('/rewards/:id', authenticate, authorize(['admin', 'manager']), loyaltyController.updateReward);
router.delete('/rewards/:id', authenticate, authorize(['admin', 'manager']), loyaltyController.deleteReward);

router.post('/apply-coupon', authenticate, authorize(['admin', 'manager', 'staff']), loyaltyController.applyCoupon);
router.get('/requests', authenticate, authorize(['admin', 'manager', 'staff']), loyaltyController.getPendingRequests);
router.patch('/requests/:id', authenticate, authorize(['admin', 'manager', 'staff']), loyaltyController.resolveRequest);

module.exports = router;

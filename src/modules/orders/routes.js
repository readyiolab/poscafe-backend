const express = require('express');
const router = express.Router();
const ordersController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');

router.get('/', authenticate, authorize(['admin', 'manager', 'staff']), ordersController.getOrders);

router.post('/pos-checkout', authenticate, authorize(['admin', 'manager', 'staff']), ordersController.posCheckout);

// Public route with rate limiting (guests can order using table QR code)
router.post('/', apiLimiter, ordersController.createOrder);

router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'staff']), ordersController.updateOrderStatus);

module.exports = router;

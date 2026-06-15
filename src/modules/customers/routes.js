const express = require('express');
const router = express.Router();
const customersController = require('./controller');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');

// Public route to capture phone number (limiter helps prevent abuse)
router.post('/', apiLimiter, customersController.saveCustomerPhone);

module.exports = router;

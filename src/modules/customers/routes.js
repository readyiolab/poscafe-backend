const express = require('express');
const router = express.Router();
const customersController = require('./controller');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');

router.post('/', apiLimiter, customersController.saveCustomerPhone);
router.get('/profile', apiLimiter, customersController.getProfile);

module.exports = router;

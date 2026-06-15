const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authLimiter } = require('../../shared/middleware/rateLimiter');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.post('/login', authLimiter, authController.login);
router.post('/register', authenticate, authorize(['admin']), authController.register); // Only admins can create other staff

module.exports = router;

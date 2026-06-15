const express = require('express');
const router = express.Router();
const analyticsController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/', authenticate, authorize(['admin', 'manager']), analyticsController.getInsights);

module.exports = router;

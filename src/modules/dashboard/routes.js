const express = require('express');
const router = express.Router();
const dashboardController = require('./controller');
const authMiddleware = require('../../shared/middleware/auth');

router.get('/', authMiddleware.authenticate, dashboardController.getDashboardData);

module.exports = router;

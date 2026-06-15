const express = require('express');
const router = express.Router();
const transactionsController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.use(authenticate, authorize(['admin', 'manager', 'staff']));

router.get('/logs', transactionsController.getLogs);
router.get('/summary', transactionsController.getSummary);

module.exports = router;

const express = require('express');
const router = express.Router();
const pettyCashController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.use(authenticate, authorize(['admin', 'manager', 'staff']));

router.get('/', pettyCashController.getStatus);
router.post('/transaction', pettyCashController.addTransaction);

module.exports = router;

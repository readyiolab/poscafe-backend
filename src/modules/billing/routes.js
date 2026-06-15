const express = require('express');
const router = express.Router();
const billingController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/:tableId', authenticate, authorize(['admin', 'manager', 'staff']), billingController.getBill);
router.get('/:tableId/pdf', authenticate, authorize(['admin', 'manager', 'staff']), billingController.generateBillPDF);
router.post('/pay', authenticate, authorize(['admin', 'manager', 'staff']), billingController.payBill);

module.exports = router;

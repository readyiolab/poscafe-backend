const express = require('express');
const router = express.Router();
const billingController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/customer-status', billingController.getCustomerStatus);
router.post('/request', billingController.requestBill);
router.post('/payment-preference', billingController.setPaymentPreference);

router.get('/requests', authenticate, authorize(['admin', 'manager', 'staff']), billingController.getActiveBillRequests);
router.post('/show-to-customer', authenticate, authorize(['admin', 'manager', 'staff']), billingController.showBillToCustomer);
router.post('/hide-from-customer', authenticate, authorize(['admin', 'manager', 'staff']), billingController.hideBillFromCustomer);

router.get('/:tableId', authenticate, authorize(['admin', 'manager', 'staff']), billingController.getBill);
router.get('/:tableId/pdf', authenticate, authorize(['admin', 'manager', 'staff']), billingController.generateBillPDF);
router.post('/pay', authenticate, authorize(['admin', 'manager', 'staff']), billingController.payBill);

module.exports = router;

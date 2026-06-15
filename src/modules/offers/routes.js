const express = require('express');
const router = express.Router();
const offersController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

// Public route for customer menu
router.get('/', offersController.getOffers);

// Protected routes for admin
router.get('/admin', authenticate, authorize(['admin', 'manager']), offersController.getAllOffersAdmin);
router.post('/', authenticate, authorize(['admin', 'manager']), offersController.createOffer);
router.put('/:id', authenticate, authorize(['admin', 'manager']), offersController.updateOffer);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), offersController.deleteOffer);

module.exports = router;

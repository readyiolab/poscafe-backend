const express = require('express');
const router = express.Router();
const inventoryController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/', authenticate, authorize(['admin', 'manager', 'staff']), inventoryController.getInventory);
router.get('/low-stock', authenticate, authorize(['admin', 'manager', 'staff']), inventoryController.getLowStockItems);
router.post('/', authenticate, authorize(['admin', 'manager']), inventoryController.createInventoryItem);
router.patch('/:id/stock', authenticate, authorize(['admin', 'manager']), inventoryController.updateStock);
router.post('/refill', authenticate, authorize(['admin', 'manager']), inventoryController.refillStock);
router.get('/:id/usage', authenticate, authorize(['admin', 'manager', 'staff']), inventoryController.getIngredientUsage);
router.put('/:id', authenticate, authorize(['admin', 'manager']), inventoryController.updateInventoryItem);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), inventoryController.deleteInventoryItem);

module.exports = router;

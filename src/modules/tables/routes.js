const express = require('express');
const router = express.Router();
const tablesController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/', authenticate, authorize(['admin', 'manager', 'staff']), tablesController.getTables); 
router.get('/by-token/:token', tablesController.getTableByToken);
router.post('/', authenticate, authorize(['admin', 'manager']), tablesController.createTable);
router.put('/:id', authenticate, authorize(['admin', 'manager']), tablesController.updateTable);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tablesController.deleteTable);
router.post('/:id/occupy', tablesController.occupyTable); // Publicly accessible for customers scanning QR
router.post('/:id/reset', authenticate, authorize(['admin', 'manager', 'staff']), tablesController.resetTable);

module.exports = router;

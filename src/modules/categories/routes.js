const express = require('express');
const router = express.Router();
const categoriesController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/', categoriesController.getCategories);
router.post('/', authenticate, authorize(['admin', 'manager']), categoriesController.createCategory);
router.patch('/:id', authenticate, authorize(['admin', 'manager']), categoriesController.updateCategory);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), categoriesController.deleteCategory);

module.exports = router;

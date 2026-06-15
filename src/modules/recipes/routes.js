const express = require('express');
const router = express.Router();
const recipesController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.get('/:menuItemId', authenticate, authorize(['admin', 'manager', 'staff']), recipesController.getRecipesByMenuItem);
router.post('/', authenticate, authorize(['admin', 'manager']), recipesController.createRecipe);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), recipesController.deleteRecipe);

module.exports = router;

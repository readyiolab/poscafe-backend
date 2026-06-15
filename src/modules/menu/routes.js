const express = require('express');
const router = express.Router();
const menuController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

const { upload } = require('../../shared/utils/cloudinary');

router.get('/', menuController.getMenu);
router.post('/', authenticate, authorize(['admin', 'manager']), upload.single('image'), menuController.createMenuItem);
router.patch('/:id', authenticate, authorize(['admin', 'manager']), upload.single('image'), menuController.updateMenuItem);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), menuController.deleteMenuItem);

module.exports = router;

const express = require('express');
const router = express.Router();
const usersController = require('./controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');

router.use(authenticate, authorize(['admin'])); // Only admins can manage users

router.get('/', usersController.getUsers);
router.patch('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;

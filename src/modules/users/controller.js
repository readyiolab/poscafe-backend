const usersService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { updateUserSchema } = require('./validator');

class UsersController {
  async getUsers(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const search = req.query.search || '';
      const { data, total } = await usersService.getUsers(config, search);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { error, value } = updateUserSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await usersService.updateUser(req.params.id, value);
      return successResponse(res, result, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await usersService.deleteUser(req.params.id);
      return successResponse(res, null, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();

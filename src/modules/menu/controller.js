const menuService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { menuSchema } = require('./validator');

class MenuController {
  async getMenu(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const categoryId = req.query.category_id || null;
      const { data, total } = await menuService.getMenu(config, categoryId);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async createMenuItem(req, res, next) {
    try {
      const { error, value } = menuSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      if (req.file) {
        value.image_url = req.file.path;
      }
      if (value.calories === '' || value.calories == null) {
        delete value.calories;
      }

      const result = await menuService.createMenuItem(value);
      return successResponse(res, result, 'Menu item created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateMenuItem(req, res, next) {
    try {
      const { error, value } = menuSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      if (req.file) {
        value.image_url = req.file.path;
      }
      if (value.calories === '' || value.calories == null) {
        delete value.calories;
      }

      const result = await menuService.updateMenuItem(req.params.id, value);
      return successResponse(res, result, 'Menu item updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteMenuItem(req, res, next) {
    try {
      await menuService.deleteMenuItem(req.params.id);
      return successResponse(res, null, 'Menu item deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MenuController();

const categoriesService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { categorySchema } = require('./validator');

class CategoriesController {
  async getCategories(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const search = req.query.search || '';
      const { data, total } = await categoriesService.getCategories(config, search);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const { error, value } = categorySchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await categoriesService.createCategory(value);
      return successResponse(res, result, 'Category created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const { error, value } = categorySchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await categoriesService.updateCategory(req.params.id, value);
      return successResponse(res, result, 'Category updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await categoriesService.deleteCategory(req.params.id);
      return successResponse(res, null, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoriesController();

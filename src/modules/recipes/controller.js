const recipesService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { recipeSchema } = require('./validator');

class RecipesController {
  async getRecipesByMenuItem(req, res, next) {
    try {
      const { menuItemId } = req.params;
      const data = await recipesService.getRecipesByMenuItem(menuItemId);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async createRecipe(req, res, next) {
    try {
      const { error, value } = recipeSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await recipesService.createRecipe(value);
      return successResponse(res, result, 'Recipe created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteRecipe(req, res, next) {
    try {
      await recipesService.deleteRecipe(req.params.id);
      return successResponse(res, null, 'Recipe deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecipesController();

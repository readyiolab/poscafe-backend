const recipesRepo = require('./repository');

class RecipesService {
  async getRecipesByMenuItem(menuItemId) {
    return recipesRepo.findRecipesByMenuItem(menuItemId);
  }

  async createRecipe(data) {
    const result = await recipesRepo.createRecipe(data);
    return { id: result.insertId, ...data };
  }

  async deleteRecipe(id) {
    await recipesRepo.deleteRecipe(id);
    return { id };
  }
}

module.exports = new RecipesService();

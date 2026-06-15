const inventoryService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { inventorySchema, updateInventorySchema, updateStockSchema } = require('./validator');

class InventoryController {
  async getInventory(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const search = req.query.search || '';
      const { data, total } = await inventoryService.getInventory(config, search);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async createInventoryItem(req, res, next) {
    try {
      const { error, value } = inventorySchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await inventoryService.createInventoryItem(value);
      return successResponse(res, result, 'Inventory item created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { error, value } = updateStockSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await inventoryService.updateStock(req.params.id, value.stock_to_add);
      return successResponse(res, result, 'Stock updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async refillStock(req, res, next) {
    try {
      const result = await inventoryService.refillStock(req.body);
      return successResponse(res, result, 'Stock refilled and logged successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateInventoryItem(req, res, next) {
    try {
      const { error, value } = updateInventorySchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await inventoryService.updateInventoryItem(req.params.id, value);
      return successResponse(res, result, 'Inventory item updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getIngredientUsage(req, res, next) {
    try {
      const result = await inventoryService.getIngredientUsage(req.params.id);
      return successResponse(res, result, 'Ingredient usage fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  async getLowStockItems(req, res, next) {
    try {
      const result = await inventoryService.getLowStockItems();
      return successResponse(res, result, 'Low stock items fetched successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventoryController();

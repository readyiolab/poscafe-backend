const tablesService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { tableSchema } = require('./validator');

class TablesController {
  async getTables(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const { data, total } = await tablesService.getTables(config);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async createTable(req, res, next) {
    try {
      const { error, value } = tableSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await tablesService.createTable(value);
      return successResponse(res, result, 'Table created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async occupyTable(req, res, next) {
    try {
      const { id } = req.params;
      const result = await tablesService.occupyTable(id);
      return successResponse(res, result, 'Table occupied');
    } catch (err) {
      next(err);
    }
  }

  async updateTable(req, res, next) {
    try {
      const { id } = req.params;
      const { error, value } = tableSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await tablesService.updateTable(id, value);
      return successResponse(res, result, 'Table updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteTable(req, res, next) {
    try {
      const { id } = req.params;
      await tablesService.deleteTable(id);
      return successResponse(res, null, 'Table deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async resetTable(req, res, next) {
    try {
      const { id } = req.params;
      const result = await tablesService.resetTable(id);
      return successResponse(res, result, 'Table reset and released');
    } catch (err) {
      next(err);
    }
  }

  async getTableByToken(req, res, next) {
    try {
      const { token } = req.params;
      const result = await tablesService.getTableByToken(token);
      return successResponse(res, result, 'Table fetched successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TablesController();

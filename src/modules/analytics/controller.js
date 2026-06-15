const analyticsService = require('./service');
const { successResponse } = require('../../shared/utils/response');

class AnalyticsController {
  async getInsights(req, res, next) {
    try {
      const data = await analyticsService.getGeneralInsights(req.query);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();

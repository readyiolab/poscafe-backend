const transactionsRepo = require('./repository');
const { successResponse } = require('../../shared/utils/response');

class TransactionsController {
  async getLogs(req, res, next) {
    try {
      const logs = await transactionsRepo.getCombinedLogs(req.query);
      return successResponse(res, logs);
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await transactionsRepo.getFinancialSummary(req.query);
      return successResponse(res, summary);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TransactionsController();

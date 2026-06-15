const pettyCashService = require('./service');
const { successResponse } = require('../../shared/utils/response');

class PettyCashController {
    async getStatus(req, res, next) {
        try {
            const data = await pettyCashService.getStatus();
            return successResponse(res, data, 'Petty cash status retrieved');
        } catch (err) {
            next(err);
        }
    }

    async addTransaction(req, res, next) {
        try {
            const { type, amount, reason } = req.body;
            if (!type || !amount) throw new Error('Type and amount are required');
            
            const result = await pettyCashService.addTransaction(type, amount, reason);
            return successResponse(res, result, `Petty cash ${type} successful`);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new PettyCashController();

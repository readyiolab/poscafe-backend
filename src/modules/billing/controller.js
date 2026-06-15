const billingService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { payBillSchema } = require('./validator');

class BillingController {
  async getBill(req, res, next) {
    try {
      const { tableId } = req.params;
      const data = await billingService.getBillForTable(tableId);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async generateBillPDF(req, res, next) {
    try {
      const { tableId } = req.params;
      const pdfBuffer = await billingService.generatePDF(tableId);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=bill-table-${tableId}.pdf`,
        'Content-Length': pdfBuffer.length
      });
      
      return res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async payBill(req, res, next) {
    try {
      const { error, value } = payBillSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await billingService.payBill(value);
      return successResponse(res, result, 'Bill paid successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BillingController();

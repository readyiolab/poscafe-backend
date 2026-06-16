const billingService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const {
  payBillSchema,
  tableTokenSchema,
  paymentPreferenceSchema,
  showBillSchema,
  hideBillSchema,
} = require('./validator');

class BillingController {
  async getCustomerStatus(req, res, next) {
    try {
      const { table_token } = req.query;
      const { error } = tableTokenSchema.validate({ table_token });
      if (error) throw error;
      const data = await billingService.getCustomerStatus(table_token);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async requestBill(req, res, next) {
    try {
      const { error, value } = tableTokenSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const data = await billingService.requestBill(value.table_token);
      return successResponse(res, data, 'Bill requested');
    } catch (err) {
      next(err);
    }
  }

  async setPaymentPreference(req, res, next) {
    try {
      const { error, value } = paymentPreferenceSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const data = await billingService.setPaymentPreference(value.table_token, value.method);
      return successResponse(res, data, 'Payment preference saved');
    } catch (err) {
      next(err);
    }
  }

  async showBillToCustomer(req, res, next) {
    try {
      const { error, value } = showBillSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const userId = req.user?.id || null;
      const data = await billingService.showBillToCustomer(value.table_id, userId);
      return successResponse(res, data, 'Bill shown to customer');
    } catch (err) {
      next(err);
    }
  }

  async hideBillFromCustomer(req, res, next) {
    try {
      const { error, value } = hideBillSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;
      const data = await billingService.hideBillFromCustomer(value.table_id);
      return successResponse(res, data, 'Bill hidden from customer');
    } catch (err) {
      next(err);
    }
  }

  async getActiveBillRequests(req, res, next) {
    try {
      const data = await billingService.getActiveBillRequests();
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

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

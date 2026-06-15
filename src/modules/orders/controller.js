const ordersService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { getPaginationConfig, formatPaginatedResponse } = require('../../shared/utils/pagination');
const { createOrderSchema, updateOrderStatusSchema, posCheckoutSchema } = require('./validator');

class OrdersController {
  async getOrders(req, res, next) {
    try {
      const config = getPaginationConfig(req.query);
      const status = req.query.status || '';
      const date = req.query.date || '';
      const { data, total } = await ordersService.getOrders(config, status, date);
      
      const formattedResponse = formatPaginatedResponse(data, total, config);
      return res.status(200).json({ status: 'success', ...formattedResponse });
    } catch (err) {
      next(err);
    }
  }

  async createOrder(req, res, next) {
    try {
      const { error, value } = createOrderSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await ordersService.createOrder(value);
      return successResponse(res, result, 'Order placed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async posCheckout(req, res, next) {
    try {
      const { error, value } = posCheckoutSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await ordersService.posCheckout(value);
      return successResponse(res, result, 'Order completed and payment recorded', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { error, value } = updateOrderStatusSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await ordersService.updateOrderStatus(req.params.id, value.status);
      return successResponse(res, result, 'Order status updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrdersController();

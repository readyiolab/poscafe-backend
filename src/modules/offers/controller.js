const offersService = require('./service');
const { successResponse } = require('../../shared/utils/response');

class OffersController {
  async getOffers(req, res, next) {
    try {
      const offers = await offersService.getOffers();
      return successResponse(res, offers, 'Offers fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAllOffersAdmin(req, res, next) {
    try {
      const offers = await offersService.getAllOffersAdmin();
      return successResponse(res, offers, 'All offers fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  async createOffer(req, res, next) {
    try {
      const result = await offersService.createOffer(req.body);
      return successResponse(res, result, 'Offer created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateOffer(req, res, next) {
    try {
      const result = await offersService.updateOffer(req.params.id, req.body);
      return successResponse(res, result, 'Offer updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteOffer(req, res, next) {
    try {
      await offersService.deleteOffer(req.params.id);
      return successResponse(res, null, 'Offer deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OffersController();

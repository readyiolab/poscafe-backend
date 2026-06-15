const dashboardService = require('./service');

class DashboardController {
  async getDashboardData(req, res) {
    try {
      const data = await dashboardService.getStats();
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DashboardController();

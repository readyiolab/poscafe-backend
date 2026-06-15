const db = require('../../shared/config/database');

class AnalyticsService {
  async getGeneralInsights(filters = {}) {
    const { period = '7d' } = filters;
    let dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';

    if (period === 'today') {
      dateFilter = 'CURDATE()';
    } else if (period === 'yesterday') {
      dateFilter = 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
    } else if (period === '30d') {
      dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const getWhereClause = (alias) => {
      const col = alias ? `${alias}.created_at` : 'created_at';
      return period === 'yesterday' 
        ? `DATE(${col}) = ${dateFilter}` 
        : `${col} >= ${dateFilter}`;
    };

    // 1. Revenue Trends
    const revenueTrend = await db.queryAll(`
      SELECT DATE(created_at) as date, SUM(grand_total) as revenue 
      FROM tbl_transactions 
      WHERE status = 'paid' 
      AND ${getWhereClause()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // 2. Top Selling Items
    const topItems = await db.queryAll(`
      SELECT mi.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
      FROM tbl_order_items oi
      JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id
      JOIN tbl_orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed'
      AND ${getWhereClause('o')}
      GROUP BY mi.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // 3. Peak Hours
    const peakHours = await db.queryAll(`
      SELECT HOUR(created_at) as hour, COUNT(*) as order_count
      FROM tbl_orders
      WHERE ${getWhereClause()}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `);

    // 4. Inventory Consumption
    const inventoryConsumption = await db.queryAll(`
      SELECT i.name, SUM(r.quantity_used * oi.quantity) as total_consumed, i.unit, i.current_stock
      FROM tbl_order_items oi
      JOIN tbl_recipes r ON oi.menu_item_id = r.menu_item_id
      JOIN tbl_inventory i ON r.inventory_id = i.id
      JOIN tbl_orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed'
      AND ${getWhereClause('o')}
      GROUP BY i.id
      ORDER BY total_consumed DESC
      LIMIT 5
    `);

    // 5. Total Metrics
    const totalRevenueRes = await db.query(`SELECT SUM(grand_total) as total FROM tbl_transactions WHERE status = 'paid' AND ${getWhereClause()}`);
    const totalOrdersRes = await db.query(`SELECT COUNT(*) as count FROM tbl_orders WHERE ${getWhereClause()}`);
    
    return {
      revenueTrend,
      topItems,
      peakHours,
      inventoryConsumption,
      metrics: {
        totalRevenue: totalRevenueRes?.total || 0,
        totalOrders: totalOrdersRes?.count || 0,
      }
    };
  }
}

module.exports = new AnalyticsService();

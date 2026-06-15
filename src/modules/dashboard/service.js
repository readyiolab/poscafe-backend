const db = require('../../shared/config/database');

class DashboardService {
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [
      revenueTodayRes,
      revenueYesterdayRes,
      activeOrdersRes,
      staffRes,
      totalTablesRes,
      occupiedTablesRes,
      recentOrders,
      stockAlerts,
      topProfitable,
      categoriesCount,
      menuItemsCount,
      recipesCount,
      inventoryCount,
      criticalMargins
    ] = await Promise.all([
      db.query('SELECT SUM(grand_total) as total FROM tbl_transactions WHERE status = ? AND DATE(created_at) = ?', ['paid', today]),
      db.query('SELECT SUM(grand_total) as total FROM tbl_transactions WHERE status = ? AND DATE(created_at) = ?', ['paid', yesterday]),
      db.query('SELECT COUNT(*) as count FROM tbl_orders WHERE status IN (?, ?, ?)', ['Pending', 'Preparing', 'Ready']),
      db.query("SELECT COUNT(*) as count FROM tbl_users WHERE role IN ('staff', 'manager')"),
      db.query('SELECT COUNT(*) as count FROM tbl_tables'),
      db.query("SELECT COUNT(*) as count FROM tbl_tables WHERE status = 'occupied'"),
      db.queryAll(`
        SELECT o.*, t.table_number 
        FROM tbl_orders o
        JOIN tbl_tables t ON o.table_id = t.id
        ORDER BY o.created_at DESC 
        LIMIT 5
      `),
      db.queryAll('SELECT * FROM tbl_inventory WHERE current_stock < 10 LIMIT 5'),
      db.queryAll(`
        SELECT 
          m.name, 
          m.price,
          (SELECT SUM(r.quantity_used * i.unit_price) FROM tbl_recipes r JOIN tbl_inventory i ON r.inventory_id = i.id WHERE r.menu_item_id = m.id) as cost
        FROM tbl_menu_items m
        WHERE m.status = 'active'
        ORDER BY (m.price - IFNULL((SELECT SUM(r.quantity_used * i.unit_price) FROM tbl_recipes r JOIN tbl_inventory i ON r.inventory_id = i.id WHERE r.menu_item_id = m.id), 0)) DESC
        LIMIT 3
      `),
      db.query('SELECT COUNT(*) as count FROM tbl_categories'),
      db.query('SELECT COUNT(*) as count FROM tbl_menu_items'),
      db.query('SELECT COUNT(DISTINCT menu_item_id) as count FROM tbl_recipes'),
      db.query('SELECT COUNT(*) as count FROM tbl_inventory'),
      db.queryAll(`
        SELECT m.name, m.price,
               (SELECT SUM(r.quantity_used * i.unit_price) 
                FROM tbl_recipes r 
                JOIN tbl_inventory i ON r.inventory_id = i.id 
                WHERE r.menu_item_id = m.id) as cost
        FROM tbl_menu_items m
        WHERE m.status = 'active'
        AND (m.price - IFNULL((SELECT SUM(r.quantity_used * i.unit_price) FROM tbl_recipes r JOIN tbl_inventory i ON r.inventory_id = i.id WHERE r.menu_item_id = m.id), 0)) / m.price < 0.2
        AND (SELECT COUNT(*) FROM tbl_recipes r WHERE r.menu_item_id = m.id) > 0
        LIMIT 5
      `)
    ]);

    const totalRevenue = revenueTodayRes?.total || 0;
    const totalYesterday = revenueYesterdayRes?.total || 0;

    let revenueTrend = 0;
    if (totalYesterday > 0) {
      revenueTrend = Math.round(((totalRevenue - totalYesterday) / totalYesterday) * 100);
    } else if (totalRevenue > 0) {
      revenueTrend = 100;
    }

    const activeOrders = activeOrdersRes?.count || 0;
    const totalStaff = staffRes?.count || 0;

    const totalTables = totalTablesRes?.count || 1;
    const occupiedTables = occupiedTablesRes?.count || 0;
    const occupancy = Math.round((occupiedTables / totalTables) * 100);

    return {
      stats: {
        totalRevenue: parseFloat(totalRevenue),
        revenueTrend,
        activeOrders,
        totalStaff,
        occupancy
      },
      recentOrders,
      stockAlerts,
      criticalMargins: criticalMargins.map(item => ({
        ...item,
        marginPercent: ((item.price - (item.cost || 0)) / item.price * 100).toFixed(1)
      })),
      setupProgress: {
        categories: categoriesCount?.count || 0,
        menuItems: menuItemsCount?.count || 0,
        recipes: recipesCount?.count || 0,
        inventory: inventoryCount?.count || 0,
        tables: totalTablesRes?.count || 0,
        isComplete: (categoriesCount?.count > 0 && menuItemsCount?.count > 0 && recipesCount?.count > 0 && inventoryCount?.count > 0 && (totalTablesRes?.count || 0) > 0)
      },
      topProfitable: topProfitable.map(item => ({
        ...item,
        profit: (item.price - (item.cost || 0)).toFixed(2)
      }))
    };
  }
}

module.exports = new DashboardService();

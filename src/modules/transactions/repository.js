const db = require('../../shared/config/database');

class TransactionsRepository {
  async getCombinedLogs(filters = {}) {
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
    
    let sql = `
      (SELECT 
        CAST('SALE' AS CHAR) as activity_type,
        t.id as reference_id,
        t.grand_total as amount,
        CAST(t.payment_method AS CHAR) as detail,
        t.created_at,
        CAST(CONCAT('Table ', tab.table_number) AS CHAR) as source
      FROM tbl_transactions t
      JOIN tbl_tables tab ON t.table_id = tab.id
      WHERE ${getWhereClause('t')})
      
      UNION ALL
      
      (SELECT 
        CAST('INVENTORY_REFILL' AS CHAR) as activity_type,
        il.id as reference_id,
        il.total_cost as amount,
        CAST(CONCAT(il.quantity_added, ' ', i.unit) AS CHAR) as detail,
        il.created_at,
        CAST(i.name AS CHAR) as source
      FROM tbl_inventory_logs il
      JOIN tbl_inventory i ON il.inventory_id = i.id
      WHERE il.type = 'refill' AND ${getWhereClause('il')})

      UNION ALL

      (SELECT 
        CAST(CASE WHEN type = 'spend' THEN 'PETTY_EXPENSE' ELSE 'PETTY_REFILL' END AS CHAR) as activity_type,
        id as reference_id,
        amount,
        CAST(reason AS CHAR) as detail,
        created_at,
        CAST('Caddy' AS CHAR) as source
      FROM tbl_petty_cash_transactions
      WHERE ${getWhereClause()})
      
      ORDER BY created_at DESC
    `;

    return db.queryAll(sql);
  }

  async getFinancialSummary(filters = {}) {
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

    const salesSql = `SELECT SUM(grand_total) as total_sales FROM tbl_transactions t WHERE ${getWhereClause('t')}`;
    const refillSql = `SELECT SUM(total_cost) as total_refill_cost FROM tbl_inventory_logs il WHERE type = 'refill' AND ${getWhereClause('il')}`;
    const pettyExpenseSql = `SELECT SUM(amount) as total_petty_spend FROM tbl_petty_cash_transactions WHERE type = 'spend' AND ${getWhereClause()}`;
    const pettyRefillSql = `SELECT SUM(amount) as total_petty_refill FROM tbl_petty_cash_transactions WHERE type = 'refill' AND ${getWhereClause()}`;
    
    const [sales, refills, pettySpend, pettyRefill] = await Promise.all([
      db.query(salesSql),
      db.query(refillSql),
      db.query(pettyExpenseSql),
      db.query(pettyRefillSql)
    ]);

    const totalSales = parseFloat(sales?.total_sales || 0);
    const totalInventoryRefills = parseFloat(refills?.total_refill_cost || 0);
    const totalPettySpend = parseFloat(pettySpend?.total_petty_spend || 0);
    const totalPettyRefill = parseFloat(pettyRefill?.total_petty_refill || 0);

    // Net Expenses = Inventory Refills + Petty Spends - Petty Refills (since refills are adding money back from outside)
    // Actually Petty Refill is usually from owner's pocket, so it's not a business "gain" in sales, but it affects cash balance.
    // In terms of Profit: Profit = Sales - (Inventory Costs + Petty Expenses)
    const totalExpenses = totalInventoryRefills + totalPettySpend;

    return {
      total_sales: totalSales,
      total_expenses: totalExpenses,
      net_balance: (totalSales - totalExpenses).toFixed(2),
      petty_refills: totalPettyRefill
    };
  }
}

module.exports = new TransactionsRepository();

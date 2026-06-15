const db = require('./src/shared/config/database');

async function migrate() {
  try {
    console.log('Running migration...');
    const sql = `
      CREATE TABLE IF NOT EXISTS tbl_inventory_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        quantity_added DECIMAL(10, 2) NOT NULL,
        unit_price DECIMAL(10, 2),
        total_cost DECIMAL(10, 2),
        type ENUM('refill', 'deduction', 'adjustment') NOT NULL DEFAULT 'refill',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES tbl_inventory(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(sql);
    console.log('Migration successful: tbl_inventory_logs created.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

const db = require('./src/shared/config/database');

async function migrate() {
  try {
    console.log('Running migration: table billing sessions...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_table_billing_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT NOT NULL,
        bill_requested_at TIMESTAMP NULL DEFAULT NULL,
        payment_preference ENUM('cash','upi') NULL DEFAULT NULL,
        bill_visible_to_customer TINYINT(1) NOT NULL DEFAULT 0,
        bill_snapshot JSON NULL,
        shown_at TIMESTAMP NULL DEFAULT NULL,
        shown_by_user_id INT NULL DEFAULT NULL,
        status ENUM('active','closed') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tbl_tables(id) ON DELETE CASCADE,
        INDEX idx_table_billing_active (table_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Migration successful: table billing sessions.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

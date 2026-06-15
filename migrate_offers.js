const db = require('./src/shared/config/database');

async function migrate() {
  try {
    console.log('🚀 Starting Offers Migration...');

    const createOffersTable = `
      CREATE TABLE IF NOT EXISTS tbl_offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        menu_item_id INT DEFAULT NULL,
        offer_price DECIMAL(10, 2) DEFAULT NULL,
        image_url VARCHAR(255) DEFAULT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_item_id) REFERENCES tbl_menu_items(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.query(createOffersTable);
    console.log('✅ tbl_offers table created or already exists.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

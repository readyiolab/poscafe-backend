const db = require('../config/database');

async function migrate() {
  try {
    console.log('Starting migration: Adding unit_price to tbl_inventory...');
    
    // Check if column exists
    const columns = await db.queryAll("SHOW COLUMNS FROM tbl_inventory LIKE 'unit_price'");
    
    if (columns.length === 0) {
      await db.query("ALTER TABLE tbl_inventory ADD COLUMN unit_price DECIMAL(10, 2) DEFAULT 0 AFTER current_stock");
      console.log('Success: unit_price added to tbl_inventory');
    } else {
      console.log('Column unit_price already exists.');
    }

    // Also ensure tbl_recipes is consistent
    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

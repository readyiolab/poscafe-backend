const db = require('./src/shared/config/database');

async function migrate() {
  try {
    console.log('Adding image_url column to tbl_menu_items...');
    await db.queryAll('ALTER TABLE tbl_menu_items ADD COLUMN image_url VARCHAR(255) DEFAULT NULL');
    console.log('Successfully added image_url column.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

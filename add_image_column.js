const db = require('./src/shared/config/database');
const { addColumnIfNotExists, isDuplicateColumnError } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
  try {
    console.log('🚀 Running migration: Adding image_url to tbl_menu_items...');
    await addColumnIfNotExists(
      db,
      'tbl_menu_items',
      'image_url',
      'image_url VARCHAR(255) DEFAULT NULL'
    );
    console.log('✅ Migration successful: image_url column ready.');
    process.exit(0);
  } catch (err) {
    if (isDuplicateColumnError(err)) {
      console.log('ℹ️ Column image_url already exists. Skipping.');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

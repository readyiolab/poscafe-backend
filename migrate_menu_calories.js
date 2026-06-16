const db = require('./src/shared/config/database');
const { addColumnIfNotExists } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
  try {
    console.log('Running migration: menu calories...');

    await addColumnIfNotExists(db, 'tbl_menu_items', 'calories', 'calories INT UNSIGNED NULL DEFAULT NULL');

    console.log('Migration successful: menu calories.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

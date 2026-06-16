const db = require('./src/shared/config/database');
const { addColumnIfNotExists } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
  try {
    console.log('Running migration: order status timestamps...');

    await addColumnIfNotExists(db, 'tbl_orders', 'preparing_at', 'preparing_at TIMESTAMP NULL DEFAULT NULL');
    await addColumnIfNotExists(db, 'tbl_orders', 'ready_at', 'ready_at TIMESTAMP NULL DEFAULT NULL');
    await addColumnIfNotExists(db, 'tbl_orders', 'completed_at', 'completed_at TIMESTAMP NULL DEFAULT NULL');

    console.log('Migration successful: order status timestamps.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

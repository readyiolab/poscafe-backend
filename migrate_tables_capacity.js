const db = require('./src/shared/config/database');
const { addColumnIfNotExists, isDuplicateColumnError } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
  try {
    console.log('🚀 Running migration: Adding capacity to tbl_tables...');
    await addColumnIfNotExists(
      db,
      'tbl_tables',
      'capacity',
      'capacity INT NOT NULL DEFAULT 4 AFTER qr_code_url'
    );
    console.log('✅ Migration successful: capacity column ready.');
    process.exit(0);
  } catch (err) {
    if (isDuplicateColumnError(err)) {
      console.log('ℹ️ Column capacity already exists. Skipping.');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

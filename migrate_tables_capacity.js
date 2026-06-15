const db = require('./src/shared/config/database');

async function migrate() {
    try {
        console.log('🚀 Running migration: Adding capacity to tbl_tables...');
        await db.query('ALTER TABLE tbl_tables ADD COLUMN capacity INT NOT NULL DEFAULT 4 AFTER qr_code_url');
        console.log('✅ Migration successful: capacity column added.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('ℹ️ Column capacity already exists. Skipping.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

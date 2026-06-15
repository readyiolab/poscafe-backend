const db = require('./src/shared/config/database');

async function migrate() {
    try {
        console.log('🚀 Running migration: Updating tbl_menu_items status ENUM...');
        await db.query("ALTER TABLE tbl_menu_items MODIFY COLUMN status ENUM('active', 'inactive', 'sold_out', 'available') NOT NULL DEFAULT 'available'");
        console.log('✅ Migration successful: status ENUM updated.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

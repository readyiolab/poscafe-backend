const db = require('./src/shared/config/database');
const { isDuplicateKeyError } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
    try {
        console.log('🚀 Running migration: Optimizing database indexes for faster queries...');
        
        // 1. Add index on tbl_orders(status) if not exists
        try {
            await db.query('CREATE INDEX idx_orders_status ON tbl_orders(status)');
            console.log('✅ Index idx_orders_status created on tbl_orders.');
        } catch (err) {
            if (isDuplicateKeyError(err)) {
                console.log('ℹ️ Index already exists. Skipping.');
            } else {
                console.log('ℹ️ Index idx_orders_status could not be created:', err.message);
            }
        }

        // 2. Add index on tbl_transactions(status) if not exists
        try {
            await db.query('CREATE INDEX idx_transactions_status ON tbl_transactions(status)');
            console.log('✅ Index idx_transactions_status created on tbl_transactions.');
        } catch (err) {
            if (isDuplicateKeyError(err)) {
                console.log('ℹ️ Index idx_transactions_status already exists. Skipping.');
            } else {
                console.log('ℹ️ Index idx_transactions_status could not be created:', err.message);
            }
        }

        // 3. Add index on tbl_menu_items(status) if not exists
        try {
            await db.query('CREATE INDEX idx_menu_items_status ON tbl_menu_items(status)');
            console.log('✅ Index idx_menu_items_status created on tbl_menu_items.');
        } catch (err) {
            if (isDuplicateKeyError(err)) {
                console.log('ℹ️ Index idx_menu_items_status already exists. Skipping.');
            } else {
                console.log('ℹ️ Index idx_menu_items_status could not be created:', err.message);
            }
        }

        console.log('🎉 Index optimization migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

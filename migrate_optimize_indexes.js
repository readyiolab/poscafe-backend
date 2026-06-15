const db = require('./src/shared/config/database');

async function migrate() {
    try {
        console.log('🚀 Running migration: Optimizing database indexes for faster queries...');
        
        // 1. Add index on tbl_orders(status) if not exists
        try {
            await db.query('CREATE INDEX idx_orders_status ON tbl_orders(status)');
            console.log('✅ Index idx_orders_status created on tbl_orders.');
        } catch (err) {
            console.log('ℹ️ Index idx_orders_status already exists or could not be created.');
        }

        // 2. Add index on tbl_transactions(status) if not exists
        try {
            await db.query('CREATE INDEX idx_transactions_status ON tbl_transactions(status)');
            console.log('✅ Index idx_transactions_status created on tbl_transactions.');
        } catch (err) {
            console.log('ℹ️ Index idx_transactions_status already exists or could not be created.');
        }

        // 3. Add index on tbl_menu_items(status) if not exists
        try {
            await db.query('CREATE INDEX idx_menu_items_status ON tbl_menu_items(status)');
            console.log('✅ Index idx_menu_items_status created on tbl_menu_items.');
        } catch (err) {
            console.log('ℹ️ Index idx_menu_items_status already exists or could not be created.');
        }

        console.log('🎉 Index optimization migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

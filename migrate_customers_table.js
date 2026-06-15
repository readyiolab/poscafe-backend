const db = require('./src/shared/config/database');

async function migrate() {
    try {
        console.log('🚀 Running migration: Creating tbl_customers...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tbl_customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone VARCHAR(20) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Migration successful: tbl_customers created.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

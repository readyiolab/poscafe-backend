const db = require('./src/shared/config/database');

async function migrate() {
    try {
        console.log('🚀 Running migration: Creating Petty Cash tables...');
        
        await db.pool.execute(`
            CREATE TABLE IF NOT EXISTS tbl_petty_cash (
                id INT PRIMARY KEY DEFAULT 1,
                balance DECIMAL(10, 2) NOT NULL DEFAULT 2000.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await db.pool.execute(`
            CREATE TABLE IF NOT EXISTS tbl_petty_cash_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('spend', 'refill') NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Initialize with 2000 if not exists
        const [rows] = await db.pool.execute('SELECT id FROM tbl_petty_cash WHERE id = 1');
        if (rows.length === 0) {
            await db.pool.execute('INSERT INTO tbl_petty_cash (id, balance) VALUES (1, 2000.00)');
            console.log('✅ Petty cash initialized with ₹2000.00');
        }

        console.log('✅ Migration successful: Petty Cash tables created.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

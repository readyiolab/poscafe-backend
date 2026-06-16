const db = require('./src/shared/config/database');
const { addColumnIfNotExists } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
  try {
    console.log('Running migration: loyalty system...');

    await addColumnIfNotExists(db, 'tbl_customers', 'points_balance', 'points_balance INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(db, 'tbl_customers', 'visit_count', 'visit_count INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(db, 'tbl_customers', 'lifetime_spend', 'lifetime_spend DECIMAL(12,2) NOT NULL DEFAULT 0');
    await addColumnIfNotExists(db, 'tbl_customers', 'last_visit_at', 'last_visit_at TIMESTAMP NULL DEFAULT NULL');

    await addColumnIfNotExists(db, 'tbl_orders', 'customer_id', 'customer_id INT NULL DEFAULT NULL');
    await addColumnIfNotExists(db, 'tbl_transactions', 'customer_id', 'customer_id INT NULL DEFAULT NULL');
    await addColumnIfNotExists(db, 'tbl_transactions', 'loyalty_points_earned', 'loyalty_points_earned INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(db, 'tbl_transactions', 'coupon_id', 'coupon_id INT NULL DEFAULT NULL');

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_loyalty_settings (
        id INT PRIMARY KEY DEFAULT 1,
        points_per_rupee DECIMAL(8,4) NOT NULL DEFAULT 0.1000,
        visit_bonus_points INT NOT NULL DEFAULT 5,
        min_order_for_points DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        max_points_per_order INT NOT NULL DEFAULT 100,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      INSERT IGNORE INTO tbl_loyalty_settings (id) VALUES (1)
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_loyalty_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(255) NULL,
        menu_item_id INT NULL,
        points_cost INT NOT NULL,
        tier ENUM('small','medium','large') NOT NULL DEFAULT 'small',
        valid_days INT NOT NULL DEFAULT 7,
        active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_item_id) REFERENCES tbl_menu_items(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_loyalty_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        type ENUM('earn','redeem','expire_refund','adjust') NOT NULL,
        points INT NOT NULL,
        balance_after INT NOT NULL,
        order_id INT NULL,
        transaction_id INT NULL,
        reward_id INT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES tbl_customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_loyalty_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        reward_id INT NOT NULL,
        code VARCHAR(16) NOT NULL UNIQUE,
        points_spent INT NOT NULL,
        status ENUM('active','used','expired') NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        used_order_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES tbl_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (reward_id) REFERENCES tbl_loyalty_rewards(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_table_service_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT NOT NULL,
        type ENUM('waiter','bill') NOT NULL,
        status ENUM('pending','done') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (table_id) REFERENCES tbl_tables(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [existingRewards] = await db.pool.execute('SELECT COUNT(*) as c FROM tbl_loyalty_rewards');
    if (existingRewards[0].c === 0) {
      await db.query(`
        INSERT INTO tbl_loyalty_rewards (name, description, points_cost, tier, valid_days, sort_order) VALUES
        ('Free Chai', 'Redeem for one complimentary chai', 50, 'small', 7, 1),
        ('Free Coffee', 'Redeem for one complimentary coffee', 120, 'medium', 21, 2),
        ('Free Meal Item', 'Redeem for one complimentary meal item', 300, 'large', 60, 3)
      `);
      console.log('Seeded default loyalty rewards.');
    }

    console.log('Migration successful: loyalty system.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

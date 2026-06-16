const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const db = require('./src/shared/config/database');

const MIGRATIONS = [
  'migrate_tables_capacity.js',
  'add_image_column.js',
  'migrate_table_tokens.js',
  'migrate_petty_cash.js',
  'migrate_logs.js',
  'migrate_menu_status.js',
  'migrate_offers.js',
  'migrate_combos.js',
  'migrate_customers_table.js',
  'migrate_optimize_indexes.js',
  'migrate_loyalty_system.js',
  'migrate_table_billing_session.js',
  'migrate_order_status_timestamps.js',
  'migrate_menu_calories.js'
];

async function runForkedScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n--------------------------------------------------`);
    console.log(`🏃 Starting migration script: ${scriptName}`);
    console.log(`--------------------------------------------------`);
    
    const child = fork(path.join(__dirname, scriptName));
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Migration script ${scriptName} exited with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // 1. Ensure schema.sql is applied if database is empty
    console.log('🔍 Checking database initialization...');
    const tablesInDb = await db.queryAll('SHOW TABLES');
    
    if (tablesInDb.length === 0) {
      console.log('ℹ️ Database is empty. Applying schema.sql first...');
      const schemaSqlPath = path.join(__dirname, 'src/shared/database/schema.sql');
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
      
      // Split SQL file by semicolons, filtering out comments and empty lines
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));
        
      for (const query of queries) {
        await db.query(query);
      }
      console.log('✅ Base schema.sql applied successfully.');
    } else {
      console.log('ℹ️ Base tables already exist. Skipping schema.sql application.');
    }

    // 2. Create tbl_migrations_run if it doesn't exist to track run migrations
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_migrations_run (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Fetch list of migrations that have already run
    const completedMigrations = await db.queryAll('SELECT name FROM tbl_migrations_run');
    const completedSet = new Set(completedMigrations.map(m => m.name));

    // 4. Run pending migrations in order
    for (const migration of MIGRATIONS) {
      if (completedSet.has(migration)) {
        console.log(`ℹ️ Migration '${migration}' has already run. Skipping.`);
        continue;
      }

      await runForkedScript(migration);
      
      // Record in tbl_migrations_run on success
      await db.insert('tbl_migrations_run', { name: migration });
      console.log(`✅ Recorded '${migration}' as completed.`);
    }

    console.log('\n==================================================');
    console.log('🎉 All database migrations run successfully!');
    console.log('==================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migrations execution failed:', err.message);
    process.exit(1);
  }
}

main();

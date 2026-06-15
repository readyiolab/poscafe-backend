const db = require('./src/shared/config/database');

async function migrate() {
  try {
    console.log('🚀 Migrating Offers table for Combos...');
    
    // Check if combo_items exists, if not add it
    const columns = await db.queryAll('SHOW COLUMNS FROM tbl_offers');
    const hasComboItems = columns.some(c => c.Field === 'combo_items');
    
    if (!hasComboItems) {
      await db.queryAll('ALTER TABLE tbl_offers ADD COLUMN combo_items JSON AFTER menu_item_id');
      console.log('✅ Added combo_items column.');
    }

    console.log('✨ Migration Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Failed:', err);
    process.exit(1);
  }
}

migrate();

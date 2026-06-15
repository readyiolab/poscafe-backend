const db = require('../config/database');

async function migrate() {
  try {
    console.log('Normalizing units in tbl_inventory...');
    
    // Convert units to lowercase and trim
    await db.query("UPDATE tbl_inventory SET unit = LOWER(TRIM(unit))");
    
    // Map common variations to our standard set
    const mappings = {
      'grams': 'gm',
      'gram': 'gm',
      'g': 'gm',
      'kilograms': 'kg',
      'kilogram': 'kg',
      'kilo': 'kg',
      'kgs': 'kg',
      'milliliters': 'ml',
      'milliliter': 'ml',
      'mls': 'ml',
      'liters': 'ltr',
      'liter': 'ltr',
      'l': 'ltr',
      'pieces': 'pcs',
      'piece': 'pcs',
      'pc': 'pcs',
      'packets': 'pkt',
      'packet': 'pkt',
      'boxes': 'box',
      'box': 'box',
      'cans': 'can',
      'can': 'can',
      'bottles': 'bottle',
      'bottle': 'bottle'
    };

    for (const [oldUnit, newUnit] of Object.entries(mappings)) {
      await db.query("UPDATE tbl_inventory SET unit = ? WHERE unit = ?", [newUnit, oldUnit]);
    }

    console.log('Unit normalization completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { dbHost, dbUser, dbPass, dbName } = require('../config/dotenvConfig');

async function seed() {
  let connection;
  try {
    console.log('🚀 Starting Database Creation, Migration and Seeding...');

    // 1. Create Database if not exists
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPass,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database "${dbName}" ensured.`);
    await connection.end();

    // 2. Connect to the database and run schema
    const db = require('../config/database');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Drop tables in correct order to avoid FK issues
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['tbl_transactions', 'tbl_order_items', 'tbl_orders', 'tbl_recipes', 'tbl_menu_items', 'tbl_categories', 'tbl_tables', 'tbl_inventory', 'tbl_users'];
    for (const table of tables) {
      await db.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    for (const statement of statements) {
      await db.query(statement);
    }
    console.log('✅ Schema migrated successfully with "tbl_" prefix.');

    // 3. Seed Default Admin (development only — use create_admin.js in production)
    const adminUsername = process.env.SEED_ADMIN_USERNAME;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.log('ℹ️  Skipping admin seed. Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD in .env to create a dev admin.');
    } else {
      const existingAdmin = await db.select('tbl_users', '*', 'username = ?', [adminUsername]);

      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        await db.insert('tbl_users', {
          username: adminUsername,
          password_hash: passwordHash,
          role: 'admin',
        });
        console.log(`✅ Default Admin created: ${adminUsername}`);
      }
    }

    // 4. Seed Initial Categories
    const categories = [
      { name: 'Gourmet Pizzas', desc: 'Hand-stretched sourdough pizzas with premium toppings' },
      { name: 'Artisan Burgers', desc: 'Flame-grilled burgers on toasted brioche buns' },
      { name: 'Signature Pasta', desc: 'Freshly made pasta with traditional sauces' },
      { name: 'Specialty Coffee', desc: 'Expertly crafted coffee and specialty lattes' },
      { name: 'Premium Teas', desc: 'Hand-picked organic loose leaf teas' },
      { name: 'Artisan Desserts', desc: 'Handcrafted sweets and pastries' }
    ];
    
    const categoryMap = {};
    for (const cat of categories) {
      const [res] = await db.pool.execute('INSERT INTO tbl_categories (name, description) VALUES (?, ?)', [cat.name, cat.desc]);
      categoryMap[cat.name] = res.insertId;
    }
    console.log('✅ Categories ensured.');

    // 5. Seed Inventory with Unit Prices
    const inventoryItems = [
      // Dairy & Basics
      { name: 'Whole Milk', unit: 'ltr', stock: 50, price: 65 },
      { name: 'Almond Milk', unit: 'ltr', stock: 20, price: 240 },
      { name: 'Mozzarella Cheese', unit: 'kg', stock: 15, price: 550 },
      { name: 'Parmesan Cheese', unit: 'kg', stock: 5, price: 1200 },
      { name: 'Burger Buns (Brioche)', unit: 'pcs', stock: 100, price: 15 },
      
      // Coffee & Tea
      { name: 'Arabica Coffee Beans', unit: 'kg', stock: 10, price: 1450 },
      { name: 'Matcha Powder', unit: 'kg', stock: 2, price: 3200 },
      { name: 'Assam Tea Leaves', unit: 'kg', stock: 5, price: 850 },
      
      // Meat & Veg
      { name: 'Chicken Breast', unit: 'kg', stock: 20, price: 320 },
      { name: 'Ground Beef (Angus)', unit: 'kg', stock: 25, price: 750 },
      { name: 'Pepperoni Slices', unit: 'kg', stock: 10, price: 950 },
      { name: 'Fresh Basil', unit: 'gm', stock: 500, price: 0.5 },
      { name: 'San Marzano Tomatoes', unit: 'can', stock: 40, price: 120 },
      
      // Pasta
      { name: 'Penne Pasta', unit: 'kg', stock: 10, price: 180 },
      { name: 'Spaghetti', unit: 'kg', stock: 10, price: 180 },
      { name: 'Heavy Cream', unit: 'ltr', stock: 10, price: 380 }
    ];

    const inventoryMap = {};
    for (const item of inventoryItems) {
      const [res] = await db.pool.execute('INSERT INTO tbl_inventory (name, unit, current_stock, unit_price) VALUES (?, ?, ?, ?)', 
        [item.name, item.unit, item.stock, item.price]
      );
      inventoryMap[item.name] = res.insertId;
    }
    console.log('✅ Inventory items seeded with costs.');

    // 6. Seed Menu Items
    const menuItems = [
      // Pizzas
      { name: 'Margherita Pizza', cat: 'Gourmet Pizzas', price: 450, desc: 'San Marzano tomatoes, fresh mozzarella, basil, and extra virgin olive oil.' },
      { name: 'Double Pepperoni', cat: 'Gourmet Pizzas', price: 580, desc: 'Loaded with premium pepperoni and extra mozzarella.' },
      
      // Burgers
      { name: 'Classic Angus Burger', cat: 'Artisan Burgers', price: 420, desc: 'Angus beef patty, brioche bun, secret sauce, and fresh greens.' },
      { name: 'Cheesy Chicken Burger', cat: 'Artisan Burgers', price: 380, desc: 'Crispy chicken breast with melted cheddar and spicy mayo.' },
      
      // Pasta
      { name: 'Penne Pink Sauce', cat: 'Signature Pasta', price: 390, desc: 'Penne tossed in a creamy tomato and basil sauce.' },
      { name: 'Chicken Alfredo', cat: 'Signature Pasta', price: 440, desc: 'Creamy white sauce pasta with grilled chicken and parmesan.' },
      
      // Coffee
      { name: 'Nordic Flat White', cat: 'Specialty Coffee', price: 210, desc: 'Double ristretto with silky micro-foam.' },
      { name: 'Matcha Green Latte', cat: 'Specialty Coffee', price: 260, desc: 'Pure Japanese matcha with steamed almond milk.' },
      
      // Tea
      { name: 'Classic Masala Chai', cat: 'Premium Teas', price: 120, desc: 'Spiced Indian tea brewed with milk and ginger.' }
    ];

    const menuItemIds = {};
    for (const item of menuItems) {
      const [res] = await db.pool.execute('INSERT INTO tbl_menu_items (category_id, name, description, price, status) VALUES (?, ?, ?, ?, ?)', [
        categoryMap[item.cat],
        item.name,
        item.desc,
        item.price,
        'available'
      ]);
      menuItemIds[item.name] = res.insertId;
    }
    console.log('✅ Diverse Menu seeded.');

    // 7. Seed Recipes
    const recipes = [
      { menu: 'Margherita Pizza', items: [{ name: 'Mozzarella Cheese', qty: 0.15 }, { name: 'San Marzano Tomatoes', qty: 0.5 }, { name: 'Fresh Basil', qty: 10 }] },
      { menu: 'Classic Angus Burger', items: [{ name: 'Ground Beef (Angus)', qty: 0.18 }, { name: 'Burger Buns (Brioche)', qty: 1 }] },
      { menu: 'Chicken Alfredo', items: [{ name: 'Spaghetti', qty: 0.12 }, { name: 'Chicken Breast', qty: 0.1 }, { name: 'Heavy Cream', qty: 0.1 }, { name: 'Parmesan Cheese', qty: 0.02 }] },
      { menu: 'Nordic Flat White', items: [{ name: 'Arabica Coffee Beans', qty: 0.02 }, { name: 'Whole Milk', qty: 0.15 }] },
      { menu: 'Classic Masala Chai', items: [{ name: 'Assam Tea Leaves', qty: 0.01 }, { name: 'Whole Milk', qty: 0.1 }] }
    ];

    for (const recipe of recipes) {
      for (const ingredient of recipe.items) {
        await db.insert('tbl_recipes', {
          menu_item_id: menuItemIds[recipe.menu],
          inventory_id: inventoryMap[ingredient.name],
          quantity_used: ingredient.qty
        });
      }
    }
    console.log('✅ Recipes linked with real costing data.');

    // 8. Seed Tables and QR codes
    const { frontendUrl } = require('../config/dotenvConfig');
    const QRCode = require('qrcode');
    
    for (let i = 1; i <= 10; i++) {
      const tableNum = `Table ${i}`;
      const capacity = i <= 4 ? 2 : (i <= 8 ? 4 : 6);
      const [result] = await db.pool.execute('INSERT INTO tbl_tables (table_number, capacity, status) VALUES (?, ?, ?)', [tableNum, capacity, 'available']);
      const tableId = result.insertId;
      
      const tableUrl = `${frontendUrl}/menu?table_id=${tableId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(tableUrl);
      
      await db.update('tbl_tables', { qr_code_url: qrCodeDataUrl }, 'id = ?', [tableId]);
    }
    console.log('✅ Tables seeded.');

    console.log('🎉 Fresh Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

seed();

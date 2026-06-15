const db = require('./src/shared/config/database');

async function seed() {
  let connection;
  try {
    console.log('Seeding dummy data...');
    connection = await db.beginTransaction();

    // 1. Clear existing data (Careful: this clears everything)
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE tbl_recipes');
    await connection.execute('TRUNCATE TABLE tbl_order_items');
    await connection.execute('TRUNCATE TABLE tbl_transactions');
    await connection.execute('TRUNCATE TABLE tbl_orders');
    await connection.execute('TRUNCATE TABLE tbl_menu_items');
    await connection.execute('TRUNCATE TABLE tbl_categories');
    await connection.execute('TRUNCATE TABLE tbl_inventory_logs');
    await connection.execute('TRUNCATE TABLE tbl_inventory');
    await connection.execute('UPDATE tbl_tables SET status = "available"');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Insert Categories
    const categories = [
      ['Beverages', 'Hot and cold drinks'],
      ['Snacks', 'Quick bites and appetizers'],
      ['Main Course', 'Full meals'],
      ['Desserts', 'Sweet treats']
    ];
    const categoryIds = [];
    for (const [name, desc] of categories) {
      const [res] = await connection.execute('INSERT INTO tbl_categories (name, description) VALUES (?, ?)', [name, desc]);
      categoryIds.push(res.insertId);
    }

    // 3. Insert Inventory
    const inventory = [
      ['Coffee Beans', 'gm', 5000],
      ['Milk', 'ml', 10000],
      ['Tea Leaves', 'gm', 2000],
      ['Sugar', 'gm', 5000],
      ['Paneer', 'gm', 3000],
      ['Chicken', 'gm', 5000],
      ['Bread Patty', 'unit', 100],
      ['Cheese Slice', 'unit', 200],
      ['Chocolate Syrup', 'ml', 2000],
      ['Pasta', 'gm', 4000]
    ];
    const inventoryIds = {};
    for (const [name, unit, stock] of inventory) {
      const [res] = await connection.execute('INSERT INTO tbl_inventory (name, unit, current_stock) VALUES (?, ?, ?)', [name, unit, stock]);
      inventoryIds[name] = res.insertId;
    }

    // 4. Insert Menu Items (20 items)
    const menuItems = [
      // Beverages
      { name: 'Espresso', catIdx: 0, price: 120, recipe: [{ name: 'Coffee Beans', qty: 18 }] },
      { name: 'Cappuccino', catIdx: 0, price: 180, recipe: [{ name: 'Coffee Beans', qty: 18 }, { name: 'Milk', qty: 150 }] },
      { name: 'Latte', catIdx: 0, price: 210, recipe: [{ name: 'Coffee Beans', qty: 18 }, { name: 'Milk', qty: 250 }] },
      { name: 'Masala Chai', catIdx: 0, price: 90, recipe: [{ name: 'Tea Leaves', qty: 5 }, { name: 'Milk', qty: 100 }, { name: 'Sugar', qty: 10 }] },
      { name: 'Cold Coffee', catIdx: 0, price: 190, recipe: [{ name: 'Coffee Beans', qty: 15 }, { name: 'Milk', qty: 200 }, { name: 'Sugar', qty: 15 }] },
      
      // Snacks
      { name: 'Paneer Tikka', catIdx: 1, price: 350, recipe: [{ name: 'Paneer', qty: 200 }] },
      { name: 'Chicken Wings', catIdx: 1, price: 420, recipe: [{ name: 'Chicken', qty: 300 }] },
      { name: 'Veg Sandwich', catIdx: 1, price: 150, recipe: [{ name: 'Bread Patty', qty: 2 }, { name: 'Cheese Slice', qty: 1 }] },
      { name: 'French Fries', catIdx: 1, price: 120, recipe: [] },
      { name: 'Garlic Bread', catIdx: 1, price: 180, recipe: [{ name: 'Bread Patty', qty: 1 }, { name: 'Cheese Slice', qty: 2 }] },
      
      // Main Course
      { name: 'Pasta Alfredo', catIdx: 2, price: 380, recipe: [{ name: 'Pasta', qty: 150 }, { name: 'Milk', qty: 100 }, { name: 'Cheese Slice', qty: 2 }] },
      { name: 'Pizza Margherita', catIdx: 2, price: 450, recipe: [{ name: 'Cheese Slice', qty: 4 }] },
      { name: 'Veg Burger', catIdx: 2, price: 220, recipe: [{ name: 'Bread Patty', qty: 2 }, { name: 'Cheese Slice', qty: 1 }] },
      { name: 'Chicken Burger', catIdx: 2, price: 280, recipe: [{ name: 'Bread Patty', qty: 2 }, { name: 'Chicken', qty: 100 }, { name: 'Cheese Slice', qty: 1 }] },
      { name: 'Pasta Arrabbiata', catIdx: 2, price: 360, recipe: [{ name: 'Pasta', qty: 150 }] },
      
      // Desserts
      { name: 'Chocolate Brownie', catIdx: 3, price: 180, recipe: [{ name: 'Chocolate Syrup', qty: 50 }] },
      { name: 'Cheesecake', catIdx: 3, price: 280, recipe: [{ name: 'Cheese Slice', qty: 2 }] },
      { name: 'Apple Pie', catIdx: 3, price: 220, recipe: [] },
      { name: 'Ice Cream Sundae', catIdx: 3, price: 250, recipe: [{ name: 'Chocolate Syrup', qty: 30 }] },
      { name: 'Gulab Jamun', catIdx: 3, price: 120, recipe: [{ name: 'Sugar', qty: 50 }] }
    ];

    for (const item of menuItems) {
      const [res] = await connection.execute(
        'INSERT INTO tbl_menu_items (name, category_id, price, status) VALUES (?, ?, ?, ?)',
        [item.name, categoryIds[item.catIdx], item.price, 'active']
      );
      const menuItemId = res.insertId;

      for (const r of item.recipe) {
        await connection.execute(
          'INSERT INTO tbl_recipes (menu_item_id, inventory_id, quantity_used) VALUES (?, ?, ?)',
          [menuItemId, inventoryIds[r.name], r.qty]
        );
      }
    }

    await db.commit(connection);
    console.log('Successfully seeded 20 dummy menu items with recipes and inventory.');
    process.exit(0);
  } catch (err) {
    if (connection) await db.rollback(connection);
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();

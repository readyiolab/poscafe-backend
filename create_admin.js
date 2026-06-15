const bcrypt = require('bcrypt');
const db = require('./src/shared/config/database');

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('❌ Usage: node create_admin.js <username> <password>');
    console.error('Example: node create_admin.js admin@sownmark.com SecretPass123');
    process.exit(1);
  }

  try {
    const existingUser = await db.select('tbl_users', '*', 'username = ?', [username]);
    if (existingUser) {
      console.error(`❌ Error: User '${username}' already exists.`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.insert('tbl_users', {
      username: username,
      password_hash: passwordHash,
      role: 'admin'
    });

    console.log(`✅ Success: Admin user '${username}' created successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create admin user:', err.message);
    process.exit(1);
  }
}

createAdmin();

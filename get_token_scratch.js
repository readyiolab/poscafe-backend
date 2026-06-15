const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Alok@123',
    database: 'cafe_pos',
  });
  
  const [rows] = await connection.execute('SELECT table_number, qr_token FROM tbl_tables LIMIT 5');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

run().catch(console.error);

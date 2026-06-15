/**
 * MySQL duplicate column errors use ER_DUP_FIELDNAME (errno 1060).
 * Some drivers/docs incorrectly reference ER_DUP_COLUMN_NAME — handle both.
 */
function isDuplicateColumnError(err) {
  if (!err) return false;
  return (
    err.code === 'ER_DUP_FIELDNAME' ||
    err.code === 'ER_DUP_COLUMN_NAME' ||
    err.errno === 1060
  );
}

function isDuplicateKeyError(err) {
  if (!err) return false;
  return err.code === 'ER_DUP_KEYNAME' || err.errno === 1061;
}

async function columnExists(db, tableName, columnName) {
  const rows = await db.queryAll(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
  return rows.length > 0;
}

async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
  const exists = await columnExists(db, tableName, columnName);
  if (exists) {
    console.log(`ℹ️ Column ${tableName}.${columnName} already exists. Skipping.`);
    return false;
  }
  await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`);
  console.log(`✅ Added column ${tableName}.${columnName}.`);
  return true;
}

module.exports = {
  isDuplicateColumnError,
  isDuplicateKeyError,
  columnExists,
  addColumnIfNotExists,
};

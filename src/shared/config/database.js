const mysql = require('mysql2/promise');
const { withRetry } = require('../utils/retry');

// Retryable MySQL error codes
const RETRYABLE_DB_ERRORS = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
  'ER_CON_COUNT_ERROR',
  'ECONNRESET',
  'ETIMEDOUT'
]);

class Database {
  constructor() {
    const { dbHost, dbUser, dbPass, dbName } = require('./dotenvConfig');

    // Create connection pool instead of single connection
    this.pool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName,

      // Pool settings for high-concurrency admin operations
      waitForConnections: true,
      connectionLimit: 50,         // Increased from 8 to allow truly parallel fetches
      queueLimit: 0,               // Unlimited queue

      // Connection settings
      timezone: 'Z',               // UTC timezone
      multipleStatements: false,   // Security: prevent SQL injection

      // Keep connections alive
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    this.isConnected = false;
    this.testConnection();
  }

  // Internal helper: Execute with retry for transient errors
  async _executeWithRetry(operation, context = 'DB') {
    return withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      context: context,
      retryIf: (error) => RETRYABLE_DB_ERRORS.has(error.code) ||
        (error.message || '').toLowerCase().includes('deadlock')
    });
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL Connection Pool Ready! (Max: 50 connections)');
      this.isConnected = true;
      connection.release();
    } catch (err) {
      console.error('❌ Database Pool Error:', err.message);
      this.isConnected = false;
      // Retry after 5 seconds
      setTimeout(() => this.testConnection(), 5000);
    }
  }

  // Health check method for monitoring
  async healthCheck() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return { status: 'healthy', poolSize: this.pool.pool._allConnections?.length || 0 };
    } catch (err) {
      return { status: 'unhealthy', error: err.message };
    }
  }

  async select(tbl_name, column = '*', where = '', params = [], print = false) {
    let wr = '';
    if (where !== '') {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [results] = await this.pool.execute(sql, params);
      return results[0] || null;
    }, 'SELECT');
  }

  async selectAll(tbl_name, column = '*', where = '', params = [], orderby = '', print = false) {
    let wr = '';
    if (where !== '') {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr} ${orderby}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [results] = await this.pool.execute(sql, params);
      return results;
    }, 'SELECT_ALL');
  }

  async insert(tbl_name, data, print = false) {
    const fields = Object.keys(data).map(key => `\`${key}\``).join(',');
    const placeholders = Object.keys(data).map(() => '?').join(',');
    const values = Object.values(data);

    const sql = `INSERT INTO ${tbl_name} (${fields}) VALUES (${placeholders})`;
    if (print) {
      console.log('SQL:', sql, 'Params:', values);
    }
    return this._executeWithRetry(async () => {
      const [result] = await this.pool.execute(sql, values);
      return {
        status: true,
        insertId: result.insertId,
        affected_rows: result.affectedRows,
        info: result.info
      };
    }, 'INSERT');
  }

  // Upsert - Insert or Update on duplicate key
  async upsert(tbl_name, data, updateData = null, print = false) {
    const fields = Object.keys(data).map(key => `\`${key}\``).join(',');
    const placeholders = Object.keys(data).map(() => '?').join(',');
    const values = Object.values(data);

    // If updateData not provided, use same data for update (excluding primary keys)
    const dataToUpdate = updateData || data;
    const updates = Object.entries(dataToUpdate)
      .filter(([key]) => key !== 'id' && key !== 'user_id') // Skip primary/unique keys
      .map(([key]) => `\`${key}\` = VALUES(\`${key}\`)`);

    const sql = `INSERT INTO ${tbl_name} (${fields}) VALUES (${placeholders}) 
                 ON DUPLICATE KEY UPDATE ${updates.join(', ')}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', values);
    }
    return this._executeWithRetry(async () => {
      const [result] = await this.pool.execute(sql, values);
      return {
        status: true,
        insertId: result.insertId,
        affected_rows: result.affectedRows,
        info: result.info
      };
    }, 'UPSERT');
  }

  async update(table_name, form_data, where = '', params = [], print = false) {
    let whereSQL = '';
    if (where !== '') {
      whereSQL = ` WHERE ${where}`;
    }

    const sets = Object.entries(form_data).map(([column]) => `\`${column}\` = ?`);
    const values = Object.values(form_data);
    const queryParams = [...values, ...params];

    const sql = `UPDATE ${table_name} SET ${sets.join(', ')}${whereSQL}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', queryParams);
    }
    return this._executeWithRetry(async () => {
      const [result] = await this.pool.execute(sql, queryParams);
      return {
        status: true,
        affected_rows: result.affectedRows,
        info: result.info
      };
    }, 'UPDATE');
  }

  async delete(tbl_name, where = '', params = [], print = false) {
    let whereSQL = '';
    if (where !== '') {
      whereSQL = ` WHERE ${where}`;
    }

    const sql = `DELETE FROM ${tbl_name}${whereSQL}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [result] = await this.pool.execute(sql, params);
      return {
        status: true,
        affected_rows: result.affectedRows,
        info: result.info
      };
    }, 'DELETE');
  }

  async query(sql, params = [], print = false) {
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [results] = await this.pool.query(sql, params);
      return results[0];
    }, 'QUERY');
  }

  async queryAll(sql, params = [], print = false) {
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [results] = await this.pool.query(sql, params);
      return results;
    }, 'QUERY_ALL');
  }

  async insertAll(sql, params = [], print = false) {
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      await this.pool.execute(sql, params);
      return { status: true };
    }, 'INSERT_ALL');
  }

  // Count records
  async count(tbl_name, where = '', params = [], print = false) {
    let wr = '';
    if (where !== '') {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT COUNT(*) as total FROM ${tbl_name} ${wr}`;
    if (print) {
      console.log('SQL:', sql, 'Params:', params);
    }
    return this._executeWithRetry(async () => {
      const [results] = await this.pool.execute(sql, params);
      return results[0].total;
    }, 'COUNT');
  }

  // Transaction support with connection from pool
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commit(connection) {
    await connection.commit();
    connection.release();
  }

  async rollback(connection) {
    await connection.rollback();
    connection.release();
  }

  // Graceful shutdown
  async close() {
    console.log('🔄 Closing database pool...');
    await this.pool.end();
    console.log('✅ Database pool closed');
  }
}

const db = new Database();

module.exports = db;

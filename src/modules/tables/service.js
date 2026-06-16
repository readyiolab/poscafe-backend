const QRCode = require('qrcode');
const crypto = require('crypto');
const tablesRepo = require('./repository');
const { frontendUrl } = require('../../shared/config/dotenvConfig');

class TablesService {
  async getTables(paginationConfig) {
    const total = await tablesRepo.countTables();
    const data = await tablesRepo.findTables(paginationConfig.sql);
    return { data, total };
  }

  async createTable(data) {
    const existing = await tablesRepo.findTableByNumber(data.table_number);
    if (existing) {
      throw { statusCode: 409, message: 'Table number already exists' };
    }

    const qrToken = crypto.randomBytes(16).toString('hex');

    const result = await tablesRepo.createTable({
      table_number: data.table_number,
      status: data.status || 'available',
      qr_token: qrToken,
      capacity: Number(data.capacity) > 0 ? Number(data.capacity) : 4,
    });

    const tableId = result.insertId;
    
    // Generate QR Code URL mapping to frontend table order page using table_token
    const tableUrl = `${frontendUrl}/menu?table_token=${qrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(tableUrl);

    // Update table with QR code
    await tablesRepo.updateTable(tableId, { qr_code_url: qrCodeDataUrl });

    const appEvents = require('../../shared/utils/events');
    appEvents.emit('table_status_updated', { table_id: tableId, status: data.status || 'available' });

    return { id: tableId, table_number: data.table_number, qr_code_url: qrCodeDataUrl, status: data.status || 'available' };
  }

  async occupyTable(id) {
    const table = await tablesRepo.findTableById(id);
    if (!table) throw { statusCode: 404, message: 'Table not found' };
    
    if (table.status === 'available') {
      await tablesRepo.updateTable(id, { status: 'occupied' });
      const appEvents = require('../../shared/utils/events');
      appEvents.emit('table_status_updated', { table_id: id, status: 'occupied' });
    }
    return { id, status: 'occupied' };
  }

  async updateTable(id, data) {
    const table = await tablesRepo.findTableById(id);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    const tableNumber = String(data.table_number || '').trim();
    if (!tableNumber) {
      throw { statusCode: 400, message: 'Table number is required' };
    }

    if (tableNumber !== String(table.table_number)) {
      const existing = await tablesRepo.findTableByNumber(tableNumber);
      if (existing && Number(existing.id) !== Number(id)) {
        throw { statusCode: 409, message: `Table "${tableNumber}" already exists. Choose another number.` };
      }
    }

    await tablesRepo.updateTable(id, {
      table_number: tableNumber,
      capacity: Number(data.capacity) > 0 ? Number(data.capacity) : table.capacity || 4,
    });

    const capacity = Number(data.capacity) > 0 ? Number(data.capacity) : table.capacity || 4;

    const appEvents = require('../../shared/utils/events');
    appEvents.emit('table_status_updated', { table_id: id, table_number: tableNumber });

    return { id: Number(id), table_number: tableNumber, capacity };
  }

  async deleteTable(id) {
    const table = await tablesRepo.findTableById(id);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    if (table.status === 'occupied') {
      throw {
        statusCode: 400,
        message: 'Cannot delete a busy table. Reset the table or complete payment first.',
      };
    }

    const db = require('../../shared/config/database');

    const activeOrders = await db.queryAll(
      'SELECT id FROM tbl_orders WHERE table_id = ? AND status IN (?, ?, ?)',
      [id, 'Pending', 'Preparing', 'Ready']
    );
    if (activeOrders.length > 0) {
      throw {
        statusCode: 400,
        message: 'This table has active orders. Use Reset Status first, then delete.',
      };
    }

    const connection = await db.beginTransaction();
    try {
      const [orderRows] = await connection.execute('SELECT id FROM tbl_orders WHERE table_id = ?', [id]);
      const orderIds = orderRows.map((row) => row.id);

      if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM tbl_transactions WHERE order_id IN (${placeholders})`, orderIds);
        await connection.execute(`DELETE FROM tbl_order_items WHERE order_id IN (${placeholders})`, orderIds);
        await connection.execute('DELETE FROM tbl_orders WHERE table_id = ?', [id]);
      }

      await connection.execute('DELETE FROM tbl_table_billing_sessions WHERE table_id = ?', [id]);
      await connection.execute('DELETE FROM tbl_table_service_requests WHERE table_id = ?', [id]);
      await connection.execute('DELETE FROM tbl_tables WHERE id = ?', [id]);

      await db.commit(connection);
    } catch (err) {
      await db.rollback(connection);
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw {
          statusCode: 400,
          message: 'Cannot delete this table — it is still linked to other records.',
        };
      }
      throw err;
    }

    const appEvents = require('../../shared/utils/events');
    appEvents.emit('table_status_updated', { table_id: id, deleted: true });
    return { success: true };
  }

  async resetTable(id) {
    const table = await tablesRepo.findTableById(id);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    const db = require('../../shared/config/database');
    const appEvents = require('../../shared/utils/events');

    // 1. Mark table as available
    await tablesRepo.updateTable(id, { status: 'available' });

    // 2. Cancel all pending/unpaid orders for this table to prevent them showing up again
    await db.queryAll('UPDATE tbl_orders SET status = ? WHERE table_id = ? AND status NOT IN (?, ?)', ['Cancelled', id, 'Completed', 'Cancelled']);

    appEvents.emit('table_status_updated', { table_id: id, status: 'available' });
    
    return { success: true, table_id: id };
  }

  async getTableByToken(token) {
    const table = await tablesRepo.findTableByToken(token);
    if (!table) {
      throw { statusCode: 404, message: 'Table not found' };
    }
    return table;
  }
}

module.exports = new TablesService();

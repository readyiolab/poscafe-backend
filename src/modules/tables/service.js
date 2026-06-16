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
      qr_token: qrToken
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
      capacity: data.capacity,
    });

    const appEvents = require('../../shared/utils/events');
    appEvents.emit('table_status_updated', { table_id: id, table_number: tableNumber });

    return { id: Number(id), table_number: tableNumber, capacity: data.capacity };
  }

  async deleteTable(id) {
    const table = await tablesRepo.findTableById(id);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    // Prevent deletion if occupied
    if (table.status === 'occupied') {
      throw { statusCode: 400, message: 'Cannot delete an occupied table' };
    }

    await tablesRepo.deleteTable(id);
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

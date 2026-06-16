const ordersRepo = require('./repository');
const db = require('../../shared/config/database');
const appEvents = require('../../shared/utils/events');

class OrdersService {
  _toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  _parseOfferItemIds(offer) {
    let ids = [];

    if (Array.isArray(offer.combo_items)) {
      ids = offer.combo_items;
    } else if (typeof offer.combo_items === 'string' && offer.combo_items.trim()) {
      try {
        const parsed = JSON.parse(offer.combo_items);
        if (Array.isArray(parsed)) ids = parsed;
      } catch (e) {
        ids = [];
      }
    }

    if (ids.length === 0 && offer.menu_item_id) {
      ids = [offer.menu_item_id];
    }

    return ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  _allocateBundlePrices(itemIds, menuById, offerPrice) {
    const basePaise = itemIds.map((id) => Math.round(this._toNumber(menuById.get(id)?.price) * 100));
    const sumBase = basePaise.reduce((acc, v) => acc + v, 0);
    const offerPaise = Math.round(this._toNumber(offerPrice) * 100);

    if (sumBase <= 0 || offerPaise <= 0 || offerPaise >= sumBase) return null;

    const shares = basePaise.map((bp, idx) => {
      const exact = (offerPaise * bp) / sumBase;
      const floor = Math.floor(exact);
      return { idx, floor, frac: exact - floor };
    });

    let used = shares.reduce((acc, s) => acc + s.floor, 0);
    let remainder = offerPaise - used;
    shares.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < shares.length && remainder > 0; i += 1) {
      shares[i].floor += 1;
      remainder -= 1;
    }
    shares.sort((a, b) => a.idx - b.idx);

    return shares.map((s) => s.floor / 100);
  }

  async _priceItemsWithOffers(items, menuById) {
    const remainingByMenuId = new Map();
    const pricedUnitsByMenuId = new Map();
    const basePriceByMenuId = new Map();

    for (const item of items) {
      const menuId = Number(item.menu_item_id);
      const qty = Number(item.quantity) || 0;
      const basePrice = this._toNumber(menuById.get(menuId)?.price);
      remainingByMenuId.set(menuId, (remainingByMenuId.get(menuId) || 0) + qty);
      basePriceByMenuId.set(menuId, basePrice);
      if (!pricedUnitsByMenuId.has(menuId)) pricedUnitsByMenuId.set(menuId, []);
    }

    const activeOffers = await db.queryAll(
      `SELECT id, menu_item_id, combo_items, offer_price
       FROM tbl_offers
       WHERE status = 'active' AND offer_price IS NOT NULL`
    );

    const normalizedOffers = activeOffers
      .map((offer) => {
        const itemIds = this._parseOfferItemIds(offer);
        const offerPrice = this._toNumber(offer.offer_price);
        const baseTotal = itemIds.reduce(
          (acc, id) => acc + this._toNumber(menuById.get(id)?.price),
          0
        );

        return {
          ...offer,
          itemIds,
          offerPrice,
          savings: baseTotal - offerPrice,
        };
      })
      .filter((offer) => offer.itemIds.length > 0 && offer.savings > 0)
      .sort((a, b) => b.savings - a.savings);

    for (const offer of normalizedOffers) {
      const reqByMenuId = new Map();
      for (const id of offer.itemIds) {
        reqByMenuId.set(id, (reqByMenuId.get(id) || 0) + 1);
      }

      let bundleCount = Infinity;
      for (const [id, reqQty] of reqByMenuId.entries()) {
        const available = remainingByMenuId.get(id) || 0;
        bundleCount = Math.min(bundleCount, Math.floor(available / reqQty));
      }
      if (!Number.isFinite(bundleCount) || bundleCount <= 0) continue;

      const expandedBundleItemIds = [];
      for (const [id, qty] of reqByMenuId.entries()) {
        for (let i = 0; i < qty; i += 1) expandedBundleItemIds.push(id);
      }

      for (let n = 0; n < bundleCount; n += 1) {
        const allocated = this._allocateBundlePrices(
          expandedBundleItemIds,
          menuById,
          offer.offer_price
        );
        if (!allocated) break;

        for (let i = 0; i < expandedBundleItemIds.length; i += 1) {
          const id = expandedBundleItemIds[i];
          const price = allocated[i];
          pricedUnitsByMenuId.get(id).push(price);
          remainingByMenuId.set(id, (remainingByMenuId.get(id) || 0) - 1);
        }
      }
    }

    for (const [menuId, remainingQty] of remainingByMenuId.entries()) {
      const base = basePriceByMenuId.get(menuId) || 0;
      for (let i = 0; i < remainingQty; i += 1) {
        pricedUnitsByMenuId.get(menuId).push(base);
      }
    }

    const pricedGroups = [];
    for (const [menuId, unitPrices] of pricedUnitsByMenuId.entries()) {
      const countByPrice = new Map();
      for (const p of unitPrices) {
        const normalized = Number(p.toFixed(2));
        const key = normalized.toFixed(2);
        countByPrice.set(key, (countByPrice.get(key) || 0) + 1);
      }

      for (const [priceKey, qty] of countByPrice.entries()) {
        pricedGroups.push({
          menu_item_id: menuId,
          quantity: qty,
          price: Number(priceKey),
        });
      }
    }

    const totalAmount = pricedGroups.reduce(
      (acc, row) => acc + row.price * row.quantity,
      0
    );

    return {
      pricedGroups,
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  }

  async getOrders(paginationConfig, status = '', date = '') {
    let where = [];
    let params = [];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    if (date) {
      where.push('DATE(created_at) = ?');
      params.push(date);
    }

    const whereSql = where.length > 0 ? where.join(' AND ') : '';

    const total = await ordersRepo.countOrders(whereSql, params);
    const data = await ordersRepo.findOrders(paginationConfig.sql, whereSql, params);

    if (data.length > 0) {
      const orderIds = data.map((o) => o.id);
      const allItems = await ordersRepo.findOrderItemsForOrderIds(orderIds);
      const itemsByOrderId = new Map();
      for (const row of allItems) {
        const oid = row.order_id;
        if (!itemsByOrderId.has(oid)) itemsByOrderId.set(oid, []);
        itemsByOrderId.get(oid).push(row);
      }
      for (const order of data) {
        order.items = itemsByOrderId.get(order.id) || [];
      }
    }

    return { data, total };
  }

  async createOrder(data) {
    if (!data.items || data.items.length === 0) {
      throw { statusCode: 400, message: 'Wait! You cannot place an empty order. Please select at least one item.' };
    }

    let tableId = data.table_id;
    if (data.table_token) {
      const tablesRepo = require('../tables/repository');
      const table = await tablesRepo.findTableByToken(data.table_token);
      if (!table) {
        throw { statusCode: 404, message: 'Invalid or inactive table token. Please scan the QR code again.' };
      }
      tableId = table.id;
    }

    if (!tableId) {
      throw { statusCode: 400, message: 'Table identification is required to place an order.' };
    }

    let connection;
    try {
      connection = await db.beginTransaction();

      // 1. Get menu item details in one query
      const uniqueMenuIds = [...new Set(data.items.map((i) => i.menu_item_id))];
      const placeholders = uniqueMenuIds.map(() => '?').join(',');
      const [menuRows] = await connection.execute(
        `SELECT id, price FROM tbl_menu_items WHERE id IN (${placeholders})`,
        uniqueMenuIds
      );
      const menuById = new Map(menuRows.map((m) => [m.id, m]));

      for (const item of data.items) {
        const menuItem = menuById.get(item.menu_item_id);
        if (!menuItem) {
          throw new Error(`Menu item with ID ${item.menu_item_id} not found`);
        }
      }

      // 2. Price items with active offers so POS bill matches customer menu pricing
      const priced = await this._priceItemsWithOffers(data.items, menuById);
      const totalAmount = priced.totalAmount;

      let customerId = null;
      if (data.customer_phone) {
        const loyaltyService = require('../loyalty/service');
        const customer = await loyaltyService.getOrCreateCustomerByPhone(data.customer_phone);
        customerId = customer?.id || null;
      }

      // 3. Insert Order
      const [orderResult] = await connection.execute(
        'INSERT INTO tbl_orders (table_id, total_amount, status, customer_id) VALUES (?, ?, ?, ?)',
        [tableId, totalAmount, 'Pending', customerId]
      );
      const orderId = orderResult.insertId;

      // Update table status to occupied
      await connection.execute('UPDATE tbl_tables SET status = ? WHERE id = ?', ['occupied', tableId]);

      // 4. Process each priced line: insert order_item and deduct inventory
      for (const item of priced.pricedGroups) {
        await connection.execute(
          'INSERT INTO tbl_order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.menu_item_id, item.quantity, item.price]
        );

        // Fetch recipe for inventory deduction
        const [recipes] = await connection.execute(
          'SELECT inventory_id, quantity_used FROM tbl_recipes WHERE menu_item_id = ?',
          [item.menu_item_id]
        );

        for (const recipe of recipes) {
          const totalIngredientNeeded = recipe.quantity_used * item.quantity;
          
          // Atomic update with optimistic lock (current_stock >= required)
          const [updateResult] = await connection.execute(
            'UPDATE tbl_inventory SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
            [totalIngredientNeeded, recipe.inventory_id, totalIngredientNeeded]
          );

          if (updateResult.affectedRows === 0) {
            const [[invItem]] = await connection.execute('SELECT name FROM tbl_inventory WHERE id = ?', [recipe.inventory_id]);
            throw new Error(`Wait! We are out of ${invItem?.name || 'ingredients'} to make this dish.`);
          }

          // Log the deduction
          await connection.execute(
            'INSERT INTO tbl_inventory_logs (inventory_id, quantity_added, type) VALUES (?, ?, ?)',
            [recipe.inventory_id, -totalIngredientNeeded, 'deduction']
          );
        }
      }

      await db.commit(connection);
      
      // Fetch full order details with joined names for the socket event
      const newOrder = await ordersRepo.findOrderById(orderId);
      if (newOrder) {
        newOrder.items = await ordersRepo.findOrderItems(orderId);
        console.log(`Order Created: ${orderId}, Items: ${newOrder.items.length}`);
        
        // Emit real-time event
        appEvents.emit('new_order', newOrder);
        appEvents.emit('table_status_updated', { table_id: tableId, status: 'occupied' });
      }

      return newOrder;
    } catch (error) {
      if (connection) {
        try {
          await db.rollback(connection);
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }
      error.statusCode = error.message.includes('out of') ? 400 : 500;
      throw error;
    }
  }

  async posCheckout(data) {
    const order = await this.createOrder({
      table_id: data.table_id,
      items: data.items,
      customer_phone: data.customer_phone || null,
    });

    const billingService = require('../billing/service');
    const payment = await billingService.payBill({
      table_id: data.table_id,
      payment_method: data.payment_method,
      customer_phone: data.customer_phone || null,
      coupon_code: data.coupon_code || null,
    });

    return {
      order,
      payment,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
    };
  }

  async updateOrderStatus(id, status) {
    const existingOrder = await ordersRepo.findOrderById(id);
    if (!existingOrder) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    await ordersRepo.updateOrderStatus(id, status);
    const updatedOrder = await ordersRepo.findOrderById(id);
    
    if (updatedOrder) {
      updatedOrder.items = await ordersRepo.findOrderItems(id);
      appEvents.emit('order_status_updated', updatedOrder);
    }
    
    return updatedOrder;
  }
}

module.exports = new OrdersService();

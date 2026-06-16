const billingRepo = require('./repository');
const ordersRepo = require('../orders/repository');
const tablesRepo = require('../tables/repository');
const db = require('../../shared/config/database');
const appEvents = require('../../shared/utils/events');
const puppeteer = require('puppeteer');
const path = require('path');

const GST_RATE = 0.05; // 5% GST

class BillingService {
  async _resolveTableFromToken(tableToken) {
    const table = await tablesRepo.findTableByToken(tableToken);
    if (!table) throw { statusCode: 404, message: 'Invalid table token' };
    return table;
  }

  async _getTableOrderState(tableId) {
    const unpaidOrders = await billingRepo.findUnpaidOrdersByTable(tableId);
    return {
      has_orders: unpaidOrders.length > 0,
      all_served: unpaidOrders.length > 0 && unpaidOrders.every((o) => o.status === 'Completed'),
      unpaid_orders: unpaidOrders,
    };
  }

  async _getOrCreateActiveSession(tableId) {
    let session = await billingRepo.findActiveSessionByTable(tableId);
    if (!session) {
      const result = await billingRepo.createSession(tableId);
      session = await db.select('tbl_table_billing_sessions', '*', 'id = ?', [result.insertId]);
    }
    return session;
  }

  _parseBillSnapshot(session) {
    if (!session?.bill_snapshot) return null;
    if (typeof session.bill_snapshot === 'object') return session.bill_snapshot;
    try {
      return JSON.parse(session.bill_snapshot);
    } catch {
      return null;
    }
  }

  _buildCustomerStatusPayload(table, orderState, session) {
    const billVisible = Boolean(session?.bill_visible_to_customer);
    const snapshot = billVisible ? this._parseBillSnapshot(session) : null;

    return {
      table_id: table.id,
      table_number: table.table_number,
      has_orders: orderState.has_orders,
      all_served: orderState.all_served,
      bill_requested: Boolean(session?.bill_requested_at),
      bill_requested_at: session?.bill_requested_at || null,
      payment_preference: session?.payment_preference || null,
      bill_visible: billVisible,
      bill: billVisible ? snapshot : null,
    };
  }

  async getCustomerStatus(tableToken) {
    const table = await this._resolveTableFromToken(tableToken);
    const orderState = await this._getTableOrderState(table.id);
    const session = await billingRepo.findActiveSessionByTable(table.id);
    return this._buildCustomerStatusPayload(table, orderState, session);
  }

  async requestBill(tableToken) {
    const table = await this._resolveTableFromToken(tableToken);
    const orderState = await this._getTableOrderState(table.id);

    if (!orderState.has_orders) {
      throw { statusCode: 400, message: 'No order yet' };
    }
    if (!orderState.all_served) {
      throw { statusCode: 400, message: 'Food not served yet' };
    }

    const session = await this._getOrCreateActiveSession(table.id);
    if (!session.bill_requested_at) {
      await billingRepo.updateSession(session.id, { bill_requested_at: new Date() });
    }

    const updatedSession = await billingRepo.findActiveSessionByTable(table.id);
    const payload = this._buildCustomerStatusPayload(table, orderState, updatedSession);

    appEvents.emit('bill_request_updated', payload);
    appEvents.emit('service_request', {
      request_id: updatedSession.id,
      table_id: table.id,
      table_number: table.table_number,
      type: 'bill',
      payment_preference: updatedSession.payment_preference,
      source: 'billing',
    });

    return payload;
  }

  async setPaymentPreference(tableToken, method) {
    const table = await this._resolveTableFromToken(tableToken);
    const orderState = await this._getTableOrderState(table.id);
    const session = await billingRepo.findActiveSessionByTable(table.id);

    if (!session?.bill_requested_at) {
      throw { statusCode: 400, message: 'Please request bill first' };
    }

    await billingRepo.updateSession(session.id, { payment_preference: method });
    const updatedSession = await billingRepo.findActiveSessionByTable(table.id);
    const payload = this._buildCustomerStatusPayload(table, orderState, updatedSession);

    appEvents.emit('bill_request_updated', payload);
    appEvents.emit('service_request', {
      request_id: updatedSession.id,
      table_id: table.id,
      table_number: table.table_number,
      type: 'bill',
      payment_preference: method,
      source: 'billing',
    });

    return payload;
  }

  async showBillToCustomer(tableId, userId = null) {
    const table = await tablesRepo.findTableById(tableId);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    const orderState = await this._getTableOrderState(tableId);
    if (!orderState.has_orders) {
      throw { statusCode: 400, message: 'No unpaid orders for this table' };
    }

    const bill = await this.getBillForTable(tableId);
    const session = await this._getOrCreateActiveSession(tableId);

    await billingRepo.updateSession(session.id, {
      bill_visible_to_customer: 1,
      bill_snapshot: JSON.stringify(bill),
      shown_at: new Date(),
      shown_by_user_id: userId,
    });

    const updatedSession = await billingRepo.findActiveSessionByTable(tableId);
    const payload = {
      ...this._buildCustomerStatusPayload(table, orderState, updatedSession),
      bill,
    };

    appEvents.emit('customer_bill_shown', payload);
    return payload;
  }

  async hideBillFromCustomer(tableId) {
    const table = await tablesRepo.findTableById(tableId);
    if (!table) throw { statusCode: 404, message: 'Table not found' };

    const session = await billingRepo.findActiveSessionByTable(tableId);
    if (!session) throw { statusCode: 404, message: 'No active billing session' };

    await billingRepo.updateSession(session.id, {
      bill_visible_to_customer: 0,
      bill_snapshot: null,
      shown_at: null,
      shown_by_user_id: null,
    });

    const orderState = await this._getTableOrderState(tableId);
    const updatedSession = await billingRepo.findActiveSessionByTable(tableId);
    const payload = this._buildCustomerStatusPayload(table, orderState, updatedSession);

    appEvents.emit('customer_bill_closed', { table_id: tableId, reason: 'hidden' });
    return payload;
  }

  async getActiveBillRequests() {
    return billingRepo.findActiveSessionsWithTableInfo();
  }

  async closeBillingSession(tableId) {
    await billingRepo.closeActiveSessionsForTable(tableId);
    appEvents.emit('customer_bill_closed', { table_id: tableId, reason: 'paid' });
  }

  async getBillForTable(tableId) {
    const table = await tablesRepo.findTableById(tableId);
    if (!table) {
      throw { statusCode: 404, message: 'Table not found' };
    }

    const unpaidOrders = await billingRepo.findUnpaidOrdersByTable(tableId);
    
    let totalAmount = 0;
    let originalAmount = 0;
    const orderDetails = [];

    for (const order of unpaidOrders) {
      const items = await ordersRepo.findOrderItems(order.id);
      const orderOriginal = items.reduce(
        (acc, item) => acc + (parseFloat(item.menu_price || item.price) * parseInt(item.quantity, 10)),
        0
      );
      totalAmount += parseFloat(order.total_amount);
      originalAmount += orderOriginal;
      orderDetails.push({
        order_id: order.id,
        status: order.status,
        amount: order.total_amount,
        original_amount: parseFloat(orderOriginal.toFixed(2)),
        items
      });
    }

    const gstAmount = totalAmount * GST_RATE;
    const grandTotal = totalAmount + gstAmount;
    const discountTotal = Math.max(0, originalAmount - totalAmount);

    return {
      table_id: tableId,
      table_number: table.table_number,
      orders: orderDetails,
      sub_total_before_discount: parseFloat(originalAmount.toFixed(2)),
      discount_total: parseFloat(discountTotal.toFixed(2)),
      sub_total: parseFloat(totalAmount.toFixed(2)),
      gst_amount: parseFloat(gstAmount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
      date: new Date().toLocaleString()
    };
  }

  async generatePDF(tableId) {
    let bill;
    try {
      bill = await this.getBillForTable(tableId);
      if (bill.orders.length === 0) throw new Error('No unpaid orders');
    } catch (e) {
      // If no unpaid orders, check for the most recent transaction session for this table
      const table = await tablesRepo.findTableById(tableId);
      if (!table) throw { statusCode: 404, message: 'Table not found' };

      // Fetch the last session's orders that were paid
      const sql = `
        SELECT o.*, t.created_at as paid_at
        FROM tbl_orders o
        JOIN tbl_transactions t ON o.id = t.order_id
        WHERE o.table_id = ? 
        ORDER BY t.created_at DESC 
        LIMIT 5
      `;
      const recentPaidOrders = await db.queryAll(sql, [tableId]);
      
      if (recentPaidOrders.length === 0) {
        throw { statusCode: 400, message: 'No active orders or recent transactions to generate bill' };
      }

      // Group them as a bill
      let totalAmount = 0;
      let originalAmount = 0;
      const orderDetails = [];
      for (const order of recentPaidOrders) {
        const items = await ordersRepo.findOrderItems(order.id);
        const orderOriginal = items.reduce(
          (acc, item) => acc + (parseFloat(item.menu_price || item.price) * parseInt(item.quantity, 10)),
          0
        );
        totalAmount += parseFloat(order.total_amount);
        originalAmount += orderOriginal;
        orderDetails.push({
          order_id: order.id,
          status: 'Paid',
          amount: order.total_amount,
          original_amount: parseFloat(orderOriginal.toFixed(2)),
          items
        });
      }

      const gstAmount = totalAmount * GST_RATE;
      const discountTotal = Math.max(0, originalAmount - totalAmount);
      bill = {
        table_id: tableId,
        table_number: table.table_number,
        orders: orderDetails,
        sub_total_before_discount: parseFloat(originalAmount.toFixed(2)),
        discount_total: parseFloat(discountTotal.toFixed(2)),
        sub_total: parseFloat(totalAmount.toFixed(2)),
        gst_amount: parseFloat(gstAmount.toFixed(2)),
        grand_total: parseFloat((totalAmount + gstAmount).toFixed(2)),
        date: new Date(recentPaidOrders[0].paid_at).toLocaleString()
      };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #d97706; }
          .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9fafb; text-align: left; padding: 12px; border-bottom: 2px solid #eee; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .grand-total { border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CAFE POS</h1>
          <p>Premium Coffee & More</p>
        </div>
        <div class="bill-info">
          <div>
            <p><strong>Table:</strong> ${bill.table_number}</p>
            <p><strong>Date:</strong> ${bill.date}</p>
          </div>
          <div>
            <p><strong>Bill No:</strong> #BILL-${Date.now().toString().slice(-6)}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${bill.orders.flatMap(o => o.items).map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price}</td>
                <td>₹${item.price * item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal (MRP)</span>
            <span>₹${bill.sub_total_before_discount ?? bill.sub_total}</span>
          </div>
          <div class="totals-row">
            <span>Offer Discount</span>
            <span>- ₹${bill.discount_total ?? 0}</span>
          </div>
          <div class="totals-row">
            <span>Subtotal (After Offer)</span>
            <span>₹${bill.sub_total}</span>
          </div>
          <div class="totals-row">
            <span>GST (5%)</span>
            <span>₹${bill.gst_amount}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Grand Total</span>
            <span>₹${bill.grand_total}</span>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for visiting! Please visit again.</p>
        </div>
      </body>
      </html>
    `;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({ format: 'A4' });
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async payBill(data) {
    const { table_id, payment_method, customer_phone, coupon_code } = data;
    
    const billDetails = await this.getBillForTable(table_id);
    if (billDetails.orders.length === 0) {
      throw { statusCode: 400, message: 'No unpaid orders for this table' };
    }

    const loyaltyService = require('../loyalty/service');
    let customerId = null;
    if (customer_phone) {
      const customer = await loyaltyService.getOrCreateCustomerByPhone(customer_phone);
      customerId = customer?.id || null;
    } else {
      for (const order of billDetails.orders) {
        const orderRow = await ordersRepo.findOrderById(order.order_id);
        if (orderRow?.customer_id) {
          customerId = orderRow.customer_id;
          break;
        }
      }
    }

    if (coupon_code) {
      const coupon = await loyaltyService.validateCoupon(coupon_code, customer_phone || null);
      if (!customerId) customerId = coupon.customer_id;
    }

    let connection;
    try {
      connection = await db.beginTransaction();

      const transactions = [];
      let totalGrandPaid = 0;

      for (const order of billDetails.orders) {
        const orderAmount = parseFloat(order.amount);
        const orderGst = orderAmount * GST_RATE;
        const orderTotal = orderAmount + orderGst;
        totalGrandPaid += orderTotal;

        const [txResult] = await connection.execute(
          'INSERT INTO tbl_transactions (table_id, order_id, total_amount, gst_amount, grand_total, status, payment_method, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [table_id, order.order_id, orderAmount, orderGst, orderTotal, 'paid', payment_method, customerId]
        );
        
        await connection.execute('UPDATE tbl_orders SET status = ?, completed_at = COALESCE(completed_at, NOW()) WHERE id = ?', ['Completed', order.order_id]);
        
        transactions.push({ id: txResult.insertId, order_id: order.order_id, grand_total: orderTotal });
      }

      if (customerId) {
        for (const o of billDetails.orders) {
          await connection.execute('UPDATE tbl_orders SET customer_id = ? WHERE id = ?', [customerId, o.order_id]);
        }
      }

      await connection.execute('UPDATE tbl_tables SET status = ? WHERE id = ?', ['available', table_id]);

      for (const tx of transactions) {
        await connection.execute(
          'UPDATE tbl_transactions SET customer_id = ? WHERE id = ?',
          [customerId, tx.id]
        );
      }

      await db.commit(connection);

      for (const order of billDetails.orders) {
        const orderRow = await ordersRepo.findOrderById(order.order_id);
        if (orderRow) {
          orderRow.items = await ordersRepo.findOrderItems(order.order_id);
          appEvents.emit('order_status_updated', orderRow);
        }
      }

      await this.closeBillingSession(table_id);

      if (coupon_code) {
        try {
          await loyaltyService.applyCoupon(coupon_code, transactions[0]?.order_id);
        } catch (couponErr) {
          console.error('Coupon apply failed:', couponErr.message);
        }
      }

      if (customerId && totalGrandPaid > 0) {
        try {
          await loyaltyService.earnOnPayment({
            customerId,
            transactionId: transactions[0]?.id,
            orderId: transactions[0]?.order_id,
            grandTotal: totalGrandPaid,
          });
        } catch (earnErr) {
          console.error('Loyalty earn failed:', earnErr.message);
        }
      }

      appEvents.emit('table_status_updated', { table_id, status: 'available' });
      
      return { 
        message: 'Payment successful and table closed', 
        table_id, 
        transactions: transactions.map((t) => t.id),
        total_paid: billDetails.grand_total,
        bill: billDetails,
        customer_id: customerId,
      };
    } catch (error) {
      if (connection) await db.rollback(connection);
      throw error;
    }
  }
}

module.exports = new BillingService();

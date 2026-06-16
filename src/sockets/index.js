const appEvents = require('../shared/utils/events');

function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`Client ${socket.id} joined kitchen room`);
    });

    socket.on('join_table', (tableId) => {
      if (tableId != null) {
        const room = `table_${tableId}`;
        socket.join(room);
        console.log(`Client ${socket.id} joined ${room}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  appEvents.on('new_order', (order) => {
    io.to('kitchen').emit('new_order', order);
    io.emit('order_placed', { order_id: order.id, table_id: order.table_id });
    console.log(`Socket: Broadcasted new_order ${order.id} to kitchen`);
  });

  appEvents.on('order_status_updated', (order) => {
    io.emit('order_status_updated', order);
    console.log(`Socket: Broadcasted order_status_updated for order ${order.id}`);
  });

  appEvents.on('table_status_updated', (data) => {
    io.emit('table_status_updated', data);
    console.log(`Socket: Broadcasted table_status_updated for table ${data.table_id}`);
  });

  appEvents.on('menu_updated', () => {
    io.emit('menu_updated');
    console.log('Socket: Broadcasted menu_updated');
  });

  appEvents.on('categories_updated', () => {
    io.emit('categories_updated');
    console.log('Socket: Broadcasted categories_updated');
  });

  appEvents.on('inventory_updated', () => {
    io.emit('inventory_updated');
    console.log('Socket: Broadcasted inventory_updated');
  });

  appEvents.on('service_request', (data) => {
    io.emit('service_request', data);
    console.log(`Socket: Broadcasted service_request for table ${data.table_number}`);
  });

  appEvents.on('service_request_resolved', (data) => {
    io.emit('service_request_resolved', data);
  });

  appEvents.on('customer_points_updated', (data) => {
    io.emit('customer_points_updated', data);
  });

  appEvents.on('bill_request_updated', (data) => {
    io.to(`table_${data.table_id}`).emit('bill_request_updated', data);
    io.emit('bill_request_updated', data);
  });

  appEvents.on('customer_bill_shown', (data) => {
    io.to(`table_${data.table_id}`).emit('customer_bill_shown', data);
    io.emit('customer_bill_shown', data);
  });

  appEvents.on('customer_bill_closed', (data) => {
    io.to(`table_${data.table_id}`).emit('customer_bill_closed', data);
    io.emit('customer_bill_closed', data);
  });
}

module.exports = setupSockets;

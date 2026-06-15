const appEvents = require('../shared/utils/events');

function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join specialized rooms if needed (e.g., 'kitchen')
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`Client ${socket.id} joined kitchen room`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Listen to application events and broadcast to sockets
  appEvents.on('new_order', (order) => {
    // Alert kitchen staff
    io.to('kitchen').emit('new_order', order);
    // Also notify all connected clients for general status updates if needed
    io.emit('order_placed', { order_id: order.id, table_id: order.table_id });
    console.log(`Socket: Broadcasted new_order ${order.id} to kitchen`);
  });

  appEvents.on('order_status_updated', (order) => {
    // Notify everyone (including table customer if they are listening)
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
}

module.exports = setupSockets;

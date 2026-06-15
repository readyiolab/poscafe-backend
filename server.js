const http = require('http');
const { port, frontendUrl, isProduction, validateConfig } = require('./src/shared/config/dotenvConfig');

// Validate before loading the rest of the app (clear error in pm2 logs)
try {
  validateConfig();
} catch (err) {
  console.error('[startup] Config validation threw:', err);
  process.exit(1);
}

const { Server } = require('socket.io');
const app = require('./src/app');
const setupSockets = require('./src/sockets');
const db = require('./src/shared/config/database');

console.log(`[startup] NODE_ENV=${isProduction ? 'production' : 'development'} PORT=${port} FRONTEND_URL=${frontendUrl}`);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
  },
});

setupSockets(io);

server.on('error', (err) => {
  console.error('[startup] Server failed to bind:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[startup] Port ${port} is already in use. Stop the other process or change PORT in .env`);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Cafe POS Backend running on port ${port} (${isProduction ? 'production' : 'development'})`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  await db.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

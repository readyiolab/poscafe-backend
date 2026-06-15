const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const setupSockets = require('./src/sockets');
const { port, frontendUrl } = require('./src/shared/config/dotenvConfig');
const db = require('./src/shared/config/database');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST']
  }
});

setupSockets(io);

server.listen(port, () => {
  console.log(`🚀 Cafe POS Backend running on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  await db.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

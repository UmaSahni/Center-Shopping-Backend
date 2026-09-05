import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { initSocketServer } from './sockets/order.socket.js';
import { prisma } from './config/db.js';

const server = http.createServer(app);

// Initialize Socket.io Server for Real-Time Order Tracking
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocketServer(io);

// Start Server
server.listen(ENV.PORT, () => {
  console.log('====================================================');
  console.log(`🚀 E-Commerce API Server running on port ${ENV.PORT}`);
  console.log(`📡 Socket.io Real-Time Tracking active on ws://localhost:${ENV.PORT}`);
  console.log(`🌐 Environment: ${ENV.NODE_ENV}`);
  console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/v1/health`);
  console.log('====================================================');
});

// Graceful Shutdown
async function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔌 HTTP server closed.');
    await prisma.$disconnect();
    console.log('💾 Prisma database disconnected.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

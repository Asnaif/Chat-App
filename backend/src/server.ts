import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { initSocket } from './sockets';

// Global crash guards to prevent container 503 errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

const startServer = async (): Promise<void> => {
  try {
    // 1. Create HTTP Server
    const httpServer = http.createServer(app);

    // 2. Initialize Socket.IO
    initSocket(httpServer);

    // 3. Start Server Listening immediately so cloud container health checks pass instantly
    const port = Number(ENV.PORT) || 5000;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🚀 Chat App Backend Server Running on Port ${port}`);
      console.log(`🌍 Health Check: http://localhost:${port}/health`);
      console.log(`🔌 Socket.IO Server active on port ${port}`);
      console.log(`⚙️ Environment: ${ENV.NODE_ENV}`);
      console.log(`===============================================`);
    });

    // 4. Connect Database in background
    connectDB();
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();


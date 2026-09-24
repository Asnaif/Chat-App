import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { initSocket } from './sockets';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create HTTP Server
    const httpServer = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocket(httpServer);

    // 4. Start Server Listening
    const port = Number(ENV.PORT) || 5000;
    httpServer.listen(port, () => {
      console.log(`===============================================`);
      console.log(`🚀 Chat App Backend Server Running on Port ${port}`);
      console.log(`🌍 Health Check: http://localhost:${port}/health`);
      console.log(`🔌 Socket.IO Server active on port ${port}`);
      console.log(`⚙️ Environment: ${ENV.NODE_ENV}`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

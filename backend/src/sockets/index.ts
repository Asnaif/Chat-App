import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ENV } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { registerPresenceHandlers } from './presence.socket';
import { registerChatHandlers } from './chat.socket';
import { registerCallHandlers } from './call.socket';

let ioInstance: Server | null = null;

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
};

export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: ENV.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket Auth Middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Socket authentication error: Token missing'));
    }

    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Socket authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.userId;

    // Join user's personal room for direct notifications/calls
    socket.join(`user:${userId}`);

    // Register modular socket handlers
    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
  });

  return io;
};

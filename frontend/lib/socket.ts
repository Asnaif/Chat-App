import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cm_chat_token') : null;

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server with ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection warning:', err.message);
    });
  } else if (!socket.connected) {
    if (token) {
      socket.auth = { token };
    }
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

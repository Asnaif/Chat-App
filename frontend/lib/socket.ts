import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cm_chat_token') : null;

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: token,
      },
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server with ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      if (err.message !== 'websocket error') {
        console.warn('⚠️ Socket connection warning:', err.message);
      }
    });
  } else {
    // Keep socket auth synchronized with current storage token
    const currentAuth = typeof socket.auth === 'object' && socket.auth !== null ? (socket.auth as Record<string, unknown>) : undefined;
    if (token && currentAuth?.token !== token) {

      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect().connect();
      } else {
        socket.connect();
      }
    } else if (!socket.connected) {
      socket.connect();
    }
  }



  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

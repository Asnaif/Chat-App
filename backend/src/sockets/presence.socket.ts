import { Server, Socket } from 'socket.io';
import { User } from '../models/User';

// Map of userId -> Set of socketIds (support multi-tab)
export const onlineUsers = new Map<string, Set<string>>();

export const registerPresenceHandlers = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.userId;
  if (!userId) return;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);

  // Broadcast user online status if first socket
  if (onlineUsers.get(userId)!.size === 1) {
    User.findByIdAndUpdate(userId, { status: 'online' }).exec();
    socket.broadcast.emit('presence:update', {
      userId,
      status: 'online',
    });
  }

  socket.on('disconnect', async () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        const lastSeenAt = new Date();
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeenAt }).exec();
        socket.broadcast.emit('presence:update', {
          userId,
          status: 'offline',
          lastSeenAt,
        });
      }
    }
  });
};

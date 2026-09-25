import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Block } from '../models/Block';
import { Attachment } from '../models/Attachment';

export const registerChatHandlers = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.userId;

  socket.on('chat:join', async ({ chatId }: { chatId: string }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const isMember = chat.participantIds.some((id) => id.toString() === userId);
      if (isMember) {
        socket.join(`chat:${chatId}`);
      }
    } catch (err) {
      console.error('[Socket chat:join Error]:', err);
    }
  });

  socket.on('chat:leave', ({ chatId }: { chatId: string }) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on(
    'message:send',
    async ({
      chatId,
      tempId,
      text,
      type = 'text',
      attachments = [],
    }: {
      chatId: string;
      tempId?: string;
      text?: string;
      type?: 'text' | 'image' | 'video' | 'audio' | 'document';
      attachments?: any[];
    }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const isMember = chat.participantIds.some((id) => id.toString() === userId);
        if (!isMember) return;

        // Day 3: Block enforcement in direct chats
        if (chat.type === 'direct') {
          const recipientId = chat.participantIds.find((id) => id.toString() !== userId);
          if (recipientId) {
            const isBlocked = await Block.exists({
              $or: [
                { ownerId: recipientId, blockedUserId: userId },
                { ownerId: userId, blockedUserId: recipientId },
              ],
            });
            if (isBlocked) {
              socket.emit('chat:error', {
                chatId,
                code: 'CHAT_BLOCKED',
                message: 'Cannot send message because one of the users has blocked the other',
              });
              return;
            }
          }
        }

        const newMessage = await Message.create({
          chatId,
          senderId: userId,
          text,
          type,
          attachments,
          deliveredTo: [userId],
          readBy: [userId],
        });

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          const attachmentDocs = attachments.map((att: any) => ({
            ownerId: new mongoose.Types.ObjectId(userId),
            messageId: newMessage._id,
            storageUrl: att.storageUrl,
            publicId: att.publicId,
            mimeType: att.mimeType || 'application/octet-stream',
            size: att.size || 0,
            name: att.name || 'attachment',
          }));
          await Attachment.insertMany(attachmentDocs);
        }

        chat.lastMessageId = newMessage._id as mongoose.Types.ObjectId;
        await chat.save();

        const populatedMessage = await Message.findById(newMessage._id).populate(
          'senderId',
          'name avatarUrl'
        );

        // Emit to all users in the chat room
        io.to(`chat:${chatId}`).emit('message:created', {
          ...populatedMessage?.toJSON(),
          tempId,
        });

        // Also notify participants in their individual user rooms
        chat.participantIds.forEach((pid) => {
          if (pid.toString() !== userId) {
            io.to(`user:${pid.toString()}`).emit('chat:updated', {
              chatId,
              lastMessage: populatedMessage,
            });
          }
        });
      } catch (err) {
        console.error('[Socket message:send Error]:', err);
      }
    }
  );

  socket.on('typing:start', ({ chatId }: { chatId: string }) => {
    socket.to(`chat:${chatId}`).emit('typing:start', { chatId, userId });
  });

  socket.on('typing:stop', ({ chatId }: { chatId: string }) => {
    socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId });
  });

  socket.on(
    'message:read',
    async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, chatId },
          { $addToSet: { readBy: userId } }
        );

        socket.to(`chat:${chatId}`).emit('message:read', {
          chatId,
          userId,
          messageIds,
        });
      } catch (err) {
        console.error('[Socket message:read Error]:', err);
      }
    }
  );
};

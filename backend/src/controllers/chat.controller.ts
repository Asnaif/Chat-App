import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Block } from '../models/Block';
import { Attachment } from '../models/Attachment';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { getIO } from '../sockets';

export const getChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;

    const chats = await Chat.find({
      participantIds: currentUserId,
    })
      .populate('participantIds', 'name email avatarUrl status lastSeenAt')
      .populate('lastMessageId')
      .sort({ updatedAt: -1 });

    sendSuccess({
      res,
      data: chats,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrGetDirectChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, 'Recipient userId is required', 'VALIDATION_ERROR');
    }

    if (userId === currentUserId) {
      throw new ApiError(400, 'Cannot create a chat with yourself', 'INVALID_OPERATION');
    }

    // Check if 1:1 chat already exists
    let chat = await Chat.findOne({
      type: 'direct',
      participantIds: { $all: [currentUserId, userId], $size: 2 },
    })
      .populate('participantIds', 'name email avatarUrl status lastSeenAt')
      .populate('lastMessageId');

    if (!chat) {
      const newChat = await Chat.create({
        type: 'direct',
        participantIds: [currentUserId, userId],
      });

      chat = await Chat.findById(newChat._id)
        .populate('participantIds', 'name email avatarUrl status lastSeenAt');
    }

    sendSuccess({
      res,
      statusCode: 200,
      data: chat,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const currentUserId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');
    }

    // Ensure user is participant
    const isMember = chat.participantIds.some((id) => id.toString() === currentUserId);
    if (!isMember) {
      throw new ApiError(403, 'Unauthorized to view this conversation', 'AUTH_FORBIDDEN');
    }

    const query: any = { chatId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit);

    const nextCursor = messages.length === limit ? messages[messages.length - 1].createdAt : null;

    sendSuccess({
      res,
      data: messages.reverse(),
      meta: { cursor: nextCursor },
    });
  } catch (error) {
    next(error);
  }
};

export const createMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const currentUserId = req.user?.userId;
    const { text, type = 'text', attachments = [], replyToId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');
    }

    if (!currentUserId) {
      throw new ApiError(401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
    }

    const isMember = chat.participantIds.some((id) => id.toString() === currentUserId);
    if (!isMember) {
      throw new ApiError(403, 'Unauthorized to post in this conversation', 'AUTH_FORBIDDEN');
    }

    // Day 3: Enforce Block permission in direct chats
    if (chat.type === 'direct') {
      const recipientId = chat.participantIds.find((id) => id.toString() !== currentUserId);
      if (recipientId) {
        const isBlocked = await Block.exists({
          $or: [
            { ownerId: recipientId, blockedUserId: currentUserId },
            { ownerId: currentUserId, blockedUserId: recipientId },
          ],
        });
        if (isBlocked) {
          throw new ApiError(403, 'Cannot send message because one of the users has blocked the other', 'CHAT_BLOCKED');
        }
      }
    }

    const newMessage = await Message.create({
      chatId: new mongoose.Types.ObjectId(chatId),
      senderId: new mongoose.Types.ObjectId(currentUserId),
      text,
      type,
      attachments,
      replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : undefined,
      deliveredTo: [new mongoose.Types.ObjectId(currentUserId)],
      readBy: [new mongoose.Types.ObjectId(currentUserId)],
    });

    // Day 3: Persist attachments in dedicated collection for media gallery tracking
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attachmentDocs = attachments.map((att: any) => ({
        ownerId: new mongoose.Types.ObjectId(currentUserId),
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

    const populatedMessage = await Message.findById(newMessage._id).populate('senderId', 'name avatarUrl');

    // Broadcast realtime event to Socket.io room and user rooms
    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('message:created', populatedMessage);

      chat.participantIds.forEach((pid) => {
        if (pid.toString() !== currentUserId) {
          io.to(`user:${pid.toString()}`).emit('chat:updated', {
            chatId,
            lastMessage: populatedMessage,
          });
        }
      });
    } catch (_) {}

    sendSuccess({
      res,
      statusCode: 201,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messageId = req.params.messageId as string;
    const currentUserId = req.user?.userId;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      throw new ApiError(400, 'Text is required to edit message', 'VALIDATION_ERROR');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
    }

    if (message.senderId.toString() !== currentUserId) {
      throw new ApiError(403, 'You can only edit your own messages', 'AUTH_FORBIDDEN');
    }

    if (message.deletedAt) {
      throw new ApiError(400, 'Cannot edit a deleted message', 'INVALID_OPERATION');
    }

    message.text = text.trim();
    await message.save();

    const populated = await Message.findById(message._id).populate('senderId', 'name avatarUrl');

    try {
      const io = getIO();
      io.to(`chat:${message.chatId}`).emit('message:updated', populated);
    } catch (_) {}

    sendSuccess({
      res,
      message: 'Message updated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messageId = req.params.messageId as string;
    const currentUserId = req.user?.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
    }

    if (message.senderId.toString() !== currentUserId) {
      throw new ApiError(403, 'You can only delete your own messages', 'AUTH_FORBIDDEN');
    }

    message.deletedAt = new Date();
    message.text = 'This message was deleted';
    await message.save();

    try {
      const io = getIO();
      io.to(`chat:${message.chatId}`).emit('message:deleted', {
        messageId: message._id,
        chatId: message.chatId,
      });
    } catch (_) {}

    sendSuccess({
      res,
      message: 'Message deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const markChatAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const currentUserId = req.user?.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');
    }

    const isMember = chat.participantIds.some((id) => id.toString() === currentUserId);
    if (!isMember) {
      throw new ApiError(403, 'Unauthorized', 'AUTH_FORBIDDEN');
    }

    await Message.updateMany(
      { chatId, readBy: { $ne: currentUserId } },
      { $addToSet: { readBy: currentUserId } }
    );

    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('message:read', {
        chatId,
        userId: currentUserId,
      });
    } catch (_) {}

    sendSuccess({
      res,
      message: 'Messages marked as read',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStarMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messageId = req.params.messageId as string;
    const message = await Message.findById(messageId);

    if (!message) {
      throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
    }

    message.isStarred = !message.isStarred;
    await message.save();

    sendSuccess({
      res,
      message: message.isStarred ? 'Message starred' : 'Message unstarred',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const getStarredMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    // Find all chats where user is participant
    const userChats = await Chat.find({ participantIds: currentUserId }).select('_id');
    const chatIds = userChats.map((c) => c._id);

    const starredMessages = await Message.find({
      chatId: { $in: chatIds },
      isStarred: true,
    })
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    sendSuccess({
      res,
      data: starredMessages,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId as string;
    const currentUserId = req.user?.userId;
    const type = req.query.type as string; // 'image' | 'video' | 'document' | 'audio' or undefined for all

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');
    }

    const isMember = chat.participantIds.some((id) => id.toString() === currentUserId);
    if (!isMember) {
      throw new ApiError(403, 'Unauthorized to view media in this conversation', 'AUTH_FORBIDDEN');
    }

    const query: any = {
      chatId,
      deletedAt: { $exists: false },
      $or: [
        { type: { $in: ['image', 'video', 'document', 'audio'] } },
        { 'attachments.0': { $exists: true } },
      ],
    };

    if (type) {
      query.type = type;
    }

    const mediaMessages = await Message.find(query)
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    sendSuccess({
      res,
      data: mediaMessages,
    });
  } catch (error) {
    next(error);
  }
};

export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  about?: string;
  status: 'online' | 'offline';
  lastSeenAt?: string | Date;
}

export interface IAttachment {
  storageUrl: string;
  name: string;
  mimeType: string;
  size: number;
  publicId?: string;
}

export interface IMessage {
  _id: string;
  chatId: string;
  senderId: IUser | string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  attachments?: IAttachment[];
  replyToId?: string;
  reactions?: Array<{ userId: string; emoji: string }>;
  isStarred?: boolean;
  deliveredTo?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt?: string;
  tempId?: string;
  isPending?: boolean;
}

export interface IChat {
  _id: string;
  type: 'direct' | 'group';
  participantIds: IUser[];
  title?: string;
  avatarUrl?: string;
  lastMessageId?: IMessage;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
}

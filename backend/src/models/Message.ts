import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachmentMeta {
  storageUrl: string;
  publicId?: string;
  mimeType: string;
  size: number;
  name: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  attachments: IAttachmentMeta[];
  replyToId?: mongoose.Types.ObjectId;
  reactions: Array<{ userId: mongoose.Types.ObjectId; emoji: string }>;
  isStarred: boolean;
  deliveredTo: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, trim: true },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document'],
      default: 'text',
      required: true,
    },
    attachments: [
      {
        storageUrl: { type: String, required: true },
        publicId: { type: String },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        name: { type: String, required: true },
      },
    ],
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message' },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    isStarred: { type: Boolean, default: false },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

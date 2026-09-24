import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'direct' | 'group';
  participantIds: mongoose.Types.ObjectId[];
  title?: string;
  avatarUrl?: string;
  lastMessageId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['direct', 'group'], default: 'direct', required: true },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    title: { type: String, trim: true },
    avatarUrl: { type: String },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

ChatSchema.index({ type: 1, participantIds: 1 });
ChatSchema.index({ updatedAt: -1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);

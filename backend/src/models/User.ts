import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  about?: string;
  status: 'online' | 'offline';
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    about: { type: String, default: 'Hey there! I am using Chat App.' },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.index({ name: 'text', email: 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  tokenHash?: string;
  userAgent?: string;
  ip?: string;
  lastActive: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String },
    userAgent: { type: String, default: 'Web Browser' },
    ip: { type: String, default: '127.0.0.1' },
    lastActive: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, revokedAt: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);

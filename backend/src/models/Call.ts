import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  _id: mongoose.Types.ObjectId;
  callerId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  type: 'audio' | 'video';
  status: 'dialing' | 'ringing' | 'active' | 'ended' | 'rejected' | 'missed';
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  durationSec?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    type: { type: String, enum: ['audio', 'video'], default: 'audio', required: true },
    status: {
      type: String,
      enum: ['dialing', 'ringing', 'active', 'ended', 'rejected', 'missed'],
      default: 'dialing',
    },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ receiverId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', CallSchema);

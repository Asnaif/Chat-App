import mongoose, { Document, Schema } from 'mongoose';

export interface IBlock extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  blockedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlockSchema.index({ ownerId: 1, blockedUserId: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);

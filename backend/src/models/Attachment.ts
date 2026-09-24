import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachment extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  storageUrl: string;
  publicId?: string;
  mimeType: string;
  size: number;
  name: string;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', index: true },
    storageUrl: { type: String, required: true },
    publicId: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AttachmentSchema.index({ ownerId: 1, createdAt: -1 });

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema);

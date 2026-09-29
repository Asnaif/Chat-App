import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  userId: mongoose.Types.ObjectId;
  theme: 'light' | 'dark' | 'system';
  lastSeenPrivacy: 'everyone' | 'contacts' | 'nobody';
  profilePhotoPrivacy: 'everyone' | 'contacts' | 'nobody';
  aboutPrivacy: 'everyone' | 'contacts' | 'nobody';
  groupPrivacy: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  keyboardShortcuts: boolean;
  securityNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    lastSeenPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    profilePhotoPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    aboutPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    groupPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    readReceipts: { type: Boolean, default: true },
    keyboardShortcuts: { type: Boolean, default: true },
    securityNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);

import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

let isConnected = false;
let lastError: string | null = null;
let activeUriType = 'Atlas (SRV)';

export const isDbConnected = (): boolean => isConnected;
export const getDbError = (): string | null => lastError;
export const getDbUriType = (): string => activeUriType;

// Direct shard hosts (bypasses SRV lookup which often times out in cloud containers)
const DIRECT_ATLAS_FALLBACK =
  'mongodb://kashifshoukat91_db_user:kashif046046@ac-bnio0fx-shard-00-00.ljzieup.mongodb.net:27017,ac-bnio0fx-shard-00-01.ljzieup.mongodb.net:27017,ac-bnio0fx-shard-00-02.ljzieup.mongodb.net:27017/chat_app?ssl=true&replicaSet=atlas-iyb8ef-shard-0&authSource=admin&retryWrites=true&w=majority';

export const connectDB = async (retryCount = 0): Promise<void> => {
  // Alternate between configured URI and direct replica set fallback
  const uri = retryCount % 2 === 1 ? DIRECT_ATLAS_FALLBACK : (ENV.MONGODB_URI || DIRECT_ATLAS_FALLBACK);
  activeUriType = uri.startsWith('mongodb+srv://') ? 'Atlas (mongodb+srv)' : 'Atlas (Direct Shards)';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6000,
    });
    isConnected = true;
    lastError = null;
    console.log(`[MongoDB Connected]: ${conn.connection.host} (${activeUriType})`);
  } catch (error: any) {
    isConnected = false;
    lastError = error?.message || String(error);
    console.error(`[MongoDB Connection Error] (attempt ${retryCount + 1}, ${activeUriType}):`, lastError);
    if (retryCount < 50) {
      setTimeout(() => connectDB(retryCount + 1), 3000);
    }
  }
};




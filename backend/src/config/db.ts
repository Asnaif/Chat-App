import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

let isConnected = false;
let lastError: string | null = null;

export const isDbConnected = (): boolean => isConnected;
export const getDbError = (): string | null => lastError;
export const getDbUriType = (): string => {
  const uri = ENV.MONGODB_URI || '';
  if (uri.startsWith('mongodb+srv://')) return 'Atlas (mongodb+srv)';
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) return 'Default Localhost (Warning: Not Cloud DB!)';
  if (uri.startsWith('mongodb://')) return 'Standard (mongodb://)';
  return 'Unknown / Empty';
};

export const connectDB = async (retryCount = 0): Promise<void> => {
  // If first attempt failed on SRV, try setting public DNS as fallback
  if (retryCount === 1) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('[MongoDB] Applied public DNS servers (8.8.8.8, 1.1.1.1) for retry');
    } catch {
      // Ignore if not allowed
    }
  }

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    lastError = null;
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error: any) {
    isConnected = false;
    lastError = error?.message || String(error);
    console.error(`[MongoDB Connection Error] (attempt ${retryCount + 1}):`, lastError);
    // Retry connection after 5 seconds instead of crashing the process
    if (retryCount < 20) {
      console.log('[MongoDB] Retrying connection in 5 seconds...');
      setTimeout(() => connectDB(retryCount + 1), 5000);
    }
  }
};



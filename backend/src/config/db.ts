import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Fallback to reliable public DNS to prevent querySrv ETIMEOUT on Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting servers is restricted
}

let isConnected = false;

export const isDbConnected = (): boolean => isConnected;

export const connectDB = async (retryCount = 0): Promise<void> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB Connection Error] (attempt ${retryCount + 1}):`, error);
    // Retry connection after 5 seconds instead of crashing the process
    if (retryCount < 10) {
      console.log('[MongoDB] Retrying connection in 5 seconds...');
      setTimeout(() => connectDB(retryCount + 1), 5000);
    }
  }
};


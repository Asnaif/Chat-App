import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Fallback to reliable public DNS to prevent querySrv ETIMEOUT on Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting servers is restricted
}

export const connectDB = async (): Promise<void> => {

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB Connection Error]:', error);
    process.exit(1);
  }
};

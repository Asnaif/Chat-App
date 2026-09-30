import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { sendSuccess } from './utils/apiResponse';

// Routes imports
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import chatsRoutes from './routes/chats.routes';
import messagesRoutes from './routes/messages.routes';
import groupsRoutes from './routes/groups.routes';
import callsRoutes from './routes/calls.routes';
import uploadsRoutes from './routes/uploads.routes';
import settingsRoutes from './routes/settings.routes';

const app: Application = express();

import os from 'os';

// Ensure uploads directory exists
const uploadsDir = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '../uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Ignore permission issue
}

// Security and Base Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (_origin, callback) => {
      // Dynamically allow any origin (e.g. Vercel deployments, localhost, mobile)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/uploads', express.static(uploadsDir));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const { isDbConnected } = require('./config/db');
  sendSuccess({
    res,
    message: 'Chat App API Server is healthy',
    data: { status: 'UP', dbConnected: isDbConnected(), timestamp: new Date().toISOString() },
  });
});

// API Rate Limiting
app.use('/api', apiLimiter);


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/upload', uploadsRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;

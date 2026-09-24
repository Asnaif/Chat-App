import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
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

// Security and Base Middlewares
app.use(helmet());
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  sendSuccess({
    res,
    message: 'Chat App API Server is healthy',
    data: { status: 'UP', timestamp: new Date().toISOString() },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;

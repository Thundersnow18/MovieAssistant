console.log('🚀 [Bootstrap] Starting Movie Assistant API process...');
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env before anything else
dotenv.config();

import authRoutes from './routes/auth.routes';
import prefRoutes from './routes/preference.routes';
import recRoutes from './routes/recommendation.routes';
import historyRoutes from './routes/history.routes';
import savedRoutes from './routes/saved.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// ─── CORS ───
const allowedOrigins = [
  process.env.FRONTEND_URL,      // Production frontend
  'http://localhost:3000',        // Local Next.js dev
  'http://localhost:5173',        // Local Vite dev
].filter(Boolean) as string[];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    
    if (allowed) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── Request Logging ───
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/preferences', prefRoutes);
app.use('/api/recommendations', recRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/saved', savedRoutes);

// ─── Health Check ───
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Movie Assistant API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth (register, login, profile)',
      preferences: '/api/preferences (get, update)',
      recommendations: '/api/recommendations (discover, trending, search, genres, providers, movie details)',
      history: '/api/history (watch history)',
      saved: '/api/saved (watchlist)',
    },
  });
});

// ─── Global Error Handler (must be after routes) ───
app.use(errorHandler);

// ─── Start Server ───
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Required for container environments (Render, Docker)

console.log(`🚀 [Bootstrap] Attempting to listen on ${HOST}:${PORT}...`);

app.listen(Number(PORT), HOST, () => {
  console.log(`\n🎬 Movie Assistant API`);
  console.log(`   Server:  http://${HOST}:${PORT}`);
  console.log(`   Health:  http://${HOST}:${PORT}/health`);
  console.log(`   Env:     ${process.env.NODE_ENV || 'development'}\n`);
});
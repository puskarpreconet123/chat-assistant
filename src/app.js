import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './routes/api.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());

// Serve Static Testing UI Dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes V1
app.use('/api/v1', apiRouter);

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[App] Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  });
});

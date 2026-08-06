import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './routes/api.routes.js';
import { verifyToken } from './services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());

// Helper function to parse cookies from headers
function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

// Helper function to extract user from session cookie token
function getUserFromSession(req) {
  const token = getCookie(req, 'token');
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch (err) {
    return null;
  }
}

// 1. Root route: Redirect based on role and login status
app.get('/', (req, res) => {
  const user = getUserFromSession(req);
  if (!user) {
    return res.redirect('/view/login.html');
  }
  if (user.role === 'agent') {
    return res.redirect('/chat.html');
  } else {
    return res.redirect('/view/home.html');
  }
});

// 2. Login pages: Redirect to root if already logged in
app.get(['/view/login.html', '/login.html'], (req, res) => {
  const user = getUserFromSession(req);
  if (user) {
    return res.redirect('/');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '../public/view/login.html'));
});

// 3. Signup page: Redirect to root if already logged in
app.get('/view/signup.html', (req, res) => {
  const user = getUserFromSession(req);
  if (user) {
    return res.redirect('/');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '../public/view/signup.html'));
});

// 4. Agent views: Restrict access to agents only
app.get(['/chat.html', '/admin.html'], (req, res, next) => {
  const user = getUserFromSession(req);
  if (!user) {
    return res.redirect('/view/login.html');
  }
  if (user.role !== 'agent') {
    return res.redirect('/view/home.html');
  }
  const page = req.path.split('/').pop() || 'chat.html';
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, `../public/${page}`));
});

// 5. Player views: Restrict access to players (users) only
app.get(['/view/home.html', '/view/recharge.html', '/view/records.html'], (req, res) => {
  const user = getUserFromSession(req);
  if (!user) {
    return res.redirect('/view/login.html');
  }
  if (user.role !== 'user') {
    return res.redirect('/chat.html');
  }
  const page = req.path.split('/').pop() || 'home.html';
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, `../public/view/${page}`));
});

// Serve Static Testing UI Dashboard (static assets, JS, CSS, images)
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

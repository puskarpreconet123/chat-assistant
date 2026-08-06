import { verifyToken } from '../services/auth.service.js';

export function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: JWT token missing'));
    }

    const decoded = verifyToken(token);
    socket.data.user = {
      emailId: decoded.emailId || decoded.id,
      role: decoded.role || 'user', // 'agent' | 'user'
      agentId: decoded.agentId || (decoded.role === 'agent' ? (decoded.emailId || decoded.id) : null),
      name: decoded.name
    };

    next();
  } catch (err) {
    console.error('[SocketAuth] Authentication failed:', err.message);
    next(new Error(`Authentication error: ${err.message}`));
  }
}

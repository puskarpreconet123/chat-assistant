import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new Error(`Invalid or expired token: ${err.message}`);
  }
}

import type { Request, RequestHandler } from 'express';
import type { SessionService } from '../auth/session-service.js';
import type { User } from '../domain/types.js';
import { parseCookies, SESSION_COOKIE } from './cookies.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

export function requireAuth(sessions: SessionService): RequestHandler {
  return async (req, _res, next) => {
    try {
      req.user = await sessions.authenticateToken(extractToken(req));
      next();
    } catch (err) {
      next(err);
    }
  };
}

import { Router } from 'express';
import type { SessionService } from '../auth/session-service.js';
import { validationError } from '../domain/errors.js';
import { extractToken, requireAuth } from './auth-middleware.js';
import { clearedSessionCookie, sessionCookie } from './cookies.js';

export function createAuthRouter(sessions: SessionService, production: boolean, googleClientId?: string): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const body = req.body as { email?: unknown; password?: unknown } | undefined;
    if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
      throw validationError('E-posta ve parola metin olarak verilmelidir.');
    }
    const { token, user } = await sessions.login({ email: body.email, password: body.password });
    res.setHeader('Set-Cookie', sessionCookie(token, production));
    res.json({ token, user });
  });

  router.post('/google', async (req, res) => {
    const body = req.body as { credential?: unknown } | undefined;
    if (typeof body?.credential !== 'string' || body.credential.length === 0) {
      throw validationError('Google kimliği metin olarak verilmelidir.');
    }
    const { token, user } = await sessions.loginWithGoogle(body.credential);
    res.setHeader('Set-Cookie', sessionCookie(token, production));
    res.json({ token, user });
  });

  router.get('/config', (_req, res) => {
    res.json({ googleClientId: googleClientId ?? null });
  });

  router.post('/logout', requireAuth(sessions), async (req, res) => {
    await sessions.logout(extractToken(req)!);
    res.setHeader('Set-Cookie', clearedSessionCookie(production));
    res.status(204).end();
  });

  router.get('/me', requireAuth(sessions), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

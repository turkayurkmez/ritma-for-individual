import express from 'express';

export interface AppDeps {}

export function createApp(_deps: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

import express from 'express';
import type { SessionService } from './auth/session-service.js';
import { notFound } from './domain/errors.js';
import { createAppointmentRouter } from './http/appointment-routes.js';
import { createAuthRouter } from './http/auth-routes.js';
import { createCustomerRouter } from './http/customer-routes.js';
import { createDocsRouter, type DocsOptions } from './http/docs-routes.js';
import { errorHandler } from './http/error-handler.js';
import { createSpaFallback } from './http/spa-fallback.js';
import type { AppointmentService } from './services/appointment-service.js';
import type { CustomerService } from './services/customer-service.js';

export interface AppDeps {
  sessions: SessionService;
  customers: CustomerService;
  appointments: AppointmentService;
  production: boolean;
  /** Google ile giriş açıksa OAuth Client ID'si; ön yüz düğmeyi buna göre gösterir. */
  googleClientId?: string;
  staticDir?: string;
  /** Swagger arayüzü (/docs). Verilmezse ya da production iken kapalıdır. */
  docs?: DocsOptions;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/v1/auth', createAuthRouter(deps.sessions, deps.production, deps.googleClientId));
  app.use('/api/v1/customers', createCustomerRouter(deps.sessions, deps.customers));
  app.use('/api/v1/appointments', createAppointmentRouter(deps.sessions, deps.appointments));

  if (deps.docs && !deps.production) app.use('/docs', createDocsRouter(deps.docs));

  app.use('/api', (_req, _res, next) => next(notFound('Adres bulunamadı.')));
  if (deps.staticDir) {
    app.use(express.static(deps.staticDir));
    app.use(createSpaFallback(deps.staticDir));
  }
  app.use(errorHandler);
  return app;
}

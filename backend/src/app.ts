import express from 'express';
import type { SessionService } from './auth/session-service.js';
import { notFound } from './domain/errors.js';
import { createAppointmentRouter } from './http/appointment-routes.js';
import { createAuthRouter } from './http/auth-routes.js';
import { createCustomerRouter } from './http/customer-routes.js';
import { errorHandler } from './http/error-handler.js';
import type { AppointmentService } from './services/appointment-service.js';
import type { CustomerService } from './services/customer-service.js';

export interface AppDeps {
  sessions: SessionService;
  customers: CustomerService;
  appointments: AppointmentService;
  production: boolean;
  staticDir?: string;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/v1/auth', createAuthRouter(deps.sessions, deps.production));
  app.use('/api/v1/customers', createCustomerRouter(deps.sessions, deps.customers));
  app.use('/api/v1/appointments', createAppointmentRouter(deps.sessions, deps.appointments));

  app.use('/api', (_req, _res, next) => next(notFound('Adres bulunamadı.')));
  app.use(errorHandler);
  return app;
}

import express from 'express';
import type { AiAssistant } from './ai/ai-assistant.js';
import { FallbackAiAssistant } from './ai/fallback-ai-assistant.js';
import type { SessionService } from './auth/session-service.js';
import { notFound } from './domain/errors.js';
import { createAiRouter } from './http/ai-routes.js';
import { createAppointmentRouter } from './http/appointment-routes.js';
import { createAuthRouter } from './http/auth-routes.js';
import { createCustomerRouter } from './http/customer-routes.js';
import { createDocsRouter, type DocsOptions } from './http/docs-routes.js';
import { errorHandler } from './http/error-handler.js';
import { createReminderRouter, createSettingsRouter } from './http/reminder-routes.js';
import { createSpaFallback } from './http/spa-fallback.js';
import type { AppointmentService } from './services/appointment-service.js';
import type { CustomerService } from './services/customer-service.js';
import type { ReminderService } from './services/reminder-service.js';

export interface AppDeps {
  sessions: SessionService;
  customers: CustomerService;
  appointments: AppointmentService;
  ai?: AiAssistant;
  reminders?: ReminderService;
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
  app.use('/api/v1/ai', createAiRouter(deps.sessions, deps.customers, deps.ai ?? new FallbackAiAssistant()));
  if (deps.reminders) {
    app.use('/api/v1/settings', createSettingsRouter(deps.sessions, deps.reminders));
    app.use('/api/v1/reminders', createReminderRouter(deps.sessions, deps.reminders));
  }

  if (deps.docs && !deps.production) app.use('/docs', createDocsRouter(deps.docs));

  app.use('/api', (_req, _res, next) => next(notFound('Adres bulunamadı.')));
  if (deps.staticDir) {
    app.use(express.static(deps.staticDir));
    app.use(createSpaFallback(deps.staticDir));
  }
  app.use(errorHandler);
  return app;
}

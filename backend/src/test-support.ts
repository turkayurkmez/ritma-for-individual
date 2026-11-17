import type { AddressInfo } from 'node:net';
import { FallbackAiAssistant } from './ai/fallback-ai-assistant.js';
import { createApp, type AppDeps } from './app.js';
import { DEMO_USERS, DemoIdentityProvider } from './auth/demo-identity-provider.js';
import type { GoogleTokenVerifier } from './auth/google-token-verifier.js';
import { SessionService } from './auth/session-service.js';
import { MemoryAppointmentRepository } from './repositories/memory/appointment-repository.js';
import { MemoryCustomerRepository } from './repositories/memory/customer-repository.js';
import { MemoryReminderNotificationRepository } from './repositories/memory/reminder-notification-repository.js';
import { MemorySessionStore } from './repositories/memory/session-store.js';
import { MemoryUserRepository } from './repositories/memory/user-repository.js';
import { AppointmentService } from './services/appointment-service.js';
import { CustomerService } from './services/customer-service.js';
import { ReminderService } from './services/reminder-service.js';

export const AYSE = { email: 'ayse@ritma.demo', password: 'demo-ayse-123' };
export const MEHMET = { email: 'mehmet@ritma.demo', password: 'demo-mehmet-123' };

export function buildTestSessions(google?: GoogleTokenVerifier): SessionService {
  return new SessionService(new DemoIdentityProvider(), new MemorySessionStore(), new MemoryUserRepository(DEMO_USERS), google);
}

export function buildTestDeps(over: Partial<AppDeps> & { now?: () => Date } = {}): AppDeps {
  const userRepo = new MemoryUserRepository(DEMO_USERS);
  const customerRepo = new MemoryCustomerRepository();
  const appointmentRepo = new MemoryAppointmentRepository();
  const notificationRepo = new MemoryReminderNotificationRepository();
  const ai = over.ai ?? new FallbackAiAssistant();
  const reminders =
    over.reminders ??
    new ReminderService(
      userRepo,
      appointmentRepo,
      customerRepo,
      notificationRepo,
      ai,
      { send: async () => {} },
      over.now,
    );
  return {
    sessions: new SessionService(new DemoIdentityProvider(), new MemorySessionStore(), userRepo),
    customers: new CustomerService(customerRepo),
    appointments: new AppointmentService(appointmentRepo, customerRepo),
    ai,
    reminders,
    production: false,
    ...over,
  };
}

export interface TestServer {
  baseUrl: string;
  close(): void;
  /** Giriş yapar ve o kullanıcı adına istek atan bir fetch sarmalayıcısı döndürür. */
  login(credentials: { email: string; password: string }): Promise<{
    token: string;
    api(path: string, init?: { method?: string; body?: unknown }): Promise<Response>;
  }>;
}

export function startTestServer(deps: AppDeps = buildTestDeps()): TestServer {
  const server = createApp(deps).listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    baseUrl,
    close: () => server.close(),
    async login(credentials) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const { token } = (await res.json()) as { token: string };
      return {
        token,
        api: (path, init = {}) =>
          fetch(`${baseUrl}/api/v1${path}`, {
            method: init.method ?? 'GET',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
          }),
      };
    },
  };
}

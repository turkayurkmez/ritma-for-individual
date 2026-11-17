import { Router } from 'express';
import type { AiAssistant } from '../ai/ai-assistant.js';
import type { SessionService } from '../auth/session-service.js';
import { validationError } from '../domain/errors.js';
import type { CustomerService } from '../services/customer-service.js';
import { requireAuth } from './auth-middleware.js';
import { todayLocal } from './customer-routes.js';

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function createAiRouter(
  sessions: SessionService,
  customers: CustomerService,
  ai: AiAssistant,
): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.post('/parse-appointment', async (req, res) => {
    const body = (req.body ?? {}) as { prompt?: unknown; referenceDate?: unknown };
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      throw validationError('Randevu komutu boş olamaz.');
    }
    const referenceDate = isDateString(body.referenceDate) ? body.referenceDate : todayLocal();
    const activeCustomers = await customers.search(req.user!.id);
    const draft = await ai.parseAppointmentPrompt({
      prompt: body.prompt.trim(),
      referenceDate,
      customers: activeCustomers.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
    });
    res.json(draft);
  });

  return router;
}

import { Router } from 'express';
import type { SessionService } from '../auth/session-service.js';
import { validationError } from '../domain/errors.js';
import { REMINDER_MINUTES_OPTIONS, type ReminderMinutes } from '../domain/types.js';
import type { ReminderService } from '../services/reminder-service.js';
import { requireAuth } from './auth-middleware.js';

function parseReminderMinutes(value: unknown): ReminderMinutes | null {
  if (value === null) return null;
  if (typeof value === 'number' && (REMINDER_MINUTES_OPTIONS as readonly number[]).includes(value)) {
    return value as ReminderMinutes;
  }
  throw validationError('Hatırlatma süresi 15, 30, 60 dakika ya da kapalı (null) olmalıdır.');
}

export function createSettingsRouter(sessions: SessionService, reminders: ReminderService): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.get('/reminders', async (req, res) => {
    res.json(await reminders.getSettings(req.user!.id));
  });

  router.patch('/reminders', async (req, res) => {
    const body = (req.body ?? {}) as { reminderMinutesBefore?: unknown };
    if (!('reminderMinutesBefore' in body)) {
      throw validationError('Hatırlatma süresi belirtilmelidir.');
    }
    const minutes = parseReminderMinutes(body.reminderMinutesBefore);
    res.json(await reminders.updateSettings(req.user!.id, minutes));
  });

  return router;
}

export function createReminderRouter(sessions: SessionService, reminders: ReminderService): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.post('/check', async (req, res) => {
    res.json(await reminders.checkUserReminders(req.user!.id));
  });

  router.get('/sent', async (req, res) => {
    res.json(await reminders.listSent(req.user!.id));
  });

  return router;
}

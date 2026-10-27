import { Router } from 'express';
import type { SessionService } from '../auth/session-service.js';
import { parseAppointmentInput, parseAppointmentPatch, parseDateRange } from '../domain/validation.js';
import type { AppointmentService } from '../services/appointment-service.js';
import { requireAuth } from './auth-middleware.js';

export function createAppointmentRouter(sessions: SessionService, appointments: AppointmentService): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.get('/', async (req, res) => {
    const { from, to } = parseDateRange(req.query.from, req.query.to);
    res.json({ appointments: await appointments.list(req.user!.id, from, to) });
  });

  router.post('/', async (req, res) => {
    const input = parseAppointmentInput(req.body);
    res.status(201).json({ appointment: await appointments.create(req.user!.id, input) });
  });

  router.get('/:id', async (req, res) => {
    res.json({ appointment: await appointments.get(req.user!.id, req.params.id) });
  });

  router.patch('/:id', async (req, res) => {
    const patch = parseAppointmentPatch(req.body);
    res.json({ appointment: await appointments.update(req.user!.id, req.params.id, patch) });
  });

  router.delete('/:id', async (req, res) => {
    await appointments.remove(req.user!.id, req.params.id);
    res.status(204).end();
  });

  return router;
}

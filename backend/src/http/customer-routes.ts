import { Router } from 'express';
import type { SessionService } from '../auth/session-service.js';
import { parseCustomerInput, parseCustomerPatch } from '../domain/validation.js';
import type { CustomerService } from '../services/customer-service.js';
import { requireAuth } from './auth-middleware.js';

export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function createCustomerRouter(sessions: SessionService, customers: CustomerService): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.get('/', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json({ customers: await customers.search(req.user!.id, search) });
  });

  router.post('/', async (req, res) => {
    const input = parseCustomerInput(req.body, todayLocal());
    res.status(201).json({ customer: await customers.create(req.user!.id, input) });
  });

  router.get('/:id', async (req, res) => {
    res.json({ customer: await customers.get(req.user!.id, req.params.id) });
  });

  router.patch('/:id', async (req, res) => {
    const patch = parseCustomerPatch(req.body, todayLocal());
    res.json({ customer: await customers.update(req.user!.id, req.params.id, patch) });
  });

  router.delete('/:id', async (req, res) => {
    await customers.softDelete(req.user!.id, req.params.id);
    res.status(204).end();
  });

  return router;
}

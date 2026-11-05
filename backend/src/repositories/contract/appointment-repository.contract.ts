import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment } from '../../domain/types.js';
import type { AppointmentRepository } from '../types.js';
import type { RepoContext } from './customer-repository.contract.js';

export type AppointmentSetup = () => Promise<
  { repo: AppointmentRepository; seedCustomer(userId: string, customerId: string): Promise<void> } & RepoContext
>;

function appointment(over: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    userId: 'u1',
    customerId: 'c1',
    date: '2026-11-05',
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    note: '',
    ...over,
  };
}

/** Bellek ve Postgres gerçeklemelerinin ikisinin de sağlaması gereken davranışlar. */
export function appointmentRepositoryContract(label: string, setup: AppointmentSetup, options: { skip?: boolean } = {}): void {
  const t = (name: string, fn: () => Promise<void>) => test(`[${label}] ${name}`, { skip: options.skip }, fn);

  async function ready() {
    const ctx = await setup();
    await ctx.seedUser('u1');
    await ctx.seedUser('u2');
    await ctx.seedCustomer('u1', 'c1');
    await ctx.seedCustomer('u2', 'c2');
    return ctx.repo;
  }

  t('a saved appointment is found with date and times unchanged', async () => {
    const repo = await ready();
    const saved = await repo.saveIfNoConflict(appointment({ startTime: '09:30', endTime: '10:15', note: 'ilk görüşme' }));
    assert.deepEqual(saved, appointment({ startTime: '09:30', endTime: '10:15', note: 'ilk görüşme' }));
    assert.deepEqual(await repo.findById('u1', 'a1'), saved);
  });

  t('saving an existing id updates it', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    await repo.saveIfNoConflict(appointment({ status: 'completed', note: 'tamam' }));
    const found = await repo.findById('u1', 'a1');
    assert.equal(found?.status, 'completed');
    assert.equal(found?.note, 'tamam');
  });

  t('an overlapping appointment is rejected and not written', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    assert.equal(await repo.saveIfNoConflict(appointment({ id: 'a2', startTime: '10:30', endTime: '11:30' })), undefined);
    assert.equal(await repo.findById('u1', 'a2'), undefined);
  });

  t('back-to-back appointments do not conflict', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    assert.ok(await repo.saveIfNoConflict(appointment({ id: 'a2', startTime: '11:00', endTime: '12:00' })));
    assert.ok(await repo.saveIfNoConflict(appointment({ id: 'a3', startTime: '09:00', endTime: '10:00' })));
  });

  t('a cancelled appointment does not hold its slot', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment({ status: 'cancelled' }));
    assert.ok(await repo.saveIfNoConflict(appointment({ id: 'a2' })));
  });

  t('reactivating a cancelled appointment into a taken slot is rejected', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment({ status: 'cancelled' }));
    await repo.saveIfNoConflict(appointment({ id: 'a2' }));
    assert.equal(await repo.saveIfNoConflict(appointment({ status: 'scheduled' })), undefined);
    assert.equal((await repo.findById('u1', 'a1'))?.status, 'cancelled');
  });

  t('editing an appointment does not conflict with itself', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    assert.ok(await repo.saveIfNoConflict(appointment({ startTime: '10:15', endTime: '10:45' })));
  });

  t('another user\'s identical slot is not a conflict', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    assert.ok(await repo.saveIfNoConflict(appointment({ id: 'a2', userId: 'u2', customerId: 'c2' })));
  });

  t('findById and delete are scoped to the owner', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment());
    assert.equal(await repo.findById('u2', 'a1'), undefined);
    assert.equal(await repo.delete('u2', 'a1'), false);
    assert.equal(await repo.delete('u1', 'a1'), true);
    assert.equal(await repo.findById('u1', 'a1'), undefined);
  });

  t('listByDateRange is inclusive and ordered by date then start time', async () => {
    const repo = await ready();
    await repo.saveIfNoConflict(appointment({ id: 'a1', date: '2026-11-06', startTime: '09:00', endTime: '10:00' }));
    await repo.saveIfNoConflict(appointment({ id: 'a2', date: '2026-11-05', startTime: '14:00', endTime: '15:00' }));
    await repo.saveIfNoConflict(appointment({ id: 'a3', date: '2026-11-05', startTime: '08:00', endTime: '09:00' }));
    await repo.saveIfNoConflict(appointment({ id: 'a4', date: '2026-11-07', startTime: '08:00', endTime: '09:00' }));
    await repo.saveIfNoConflict(appointment({ id: 'a5', userId: 'u2', customerId: 'c2', date: '2026-11-05' }));
    const ids = (await repo.listByDateRange('u1', '2026-11-05', '2026-11-06')).map((a) => a.id);
    assert.deepEqual(ids, ['a3', 'a2', 'a1']);
  });

  t('of two concurrent saves for the same slot exactly one wins', async () => {
    const repo = await ready();
    const results = await Promise.all([
      repo.saveIfNoConflict(appointment({ id: 'a1' })),
      repo.saveIfNoConflict(appointment({ id: 'a2' })),
    ]);
    assert.equal(results.filter((r) => r !== undefined).length, 1);
  });
}

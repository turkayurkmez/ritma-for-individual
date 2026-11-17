import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ReminderNotification } from '../../domain/types.js';
import type { ReminderNotificationRepository } from '../types.js';

export type ReminderNotificationSetup = () => Promise<{
  repo: ReminderNotificationRepository;
  seedAppointment(userId: string, customerId: string, appointmentId: string): Promise<void>;
}>;

export function reminderNotificationRepositoryContract(
  label: string,
  setup: ReminderNotificationSetup,
  options: { skip?: boolean } = {},
): void {
  const t = (name: string, fn: () => Promise<void>) => test(`[${label}] ${name}`, { skip: options.skip }, fn);

  t('creates and lists notifications per user ordered from newest to oldest', async () => {
    const { repo, seedAppointment } = await setup();
    await seedAppointment('u1', 'c1', 'a1');
    await seedAppointment('u1', 'c1', 'a2');
    await seedAppointment('u2', 'c2', 'a3');

    const n1: ReminderNotification = {
      id: 'n1',
      userId: 'u1',
      appointmentId: 'a1',
      recipientEmail: 'u1@test.local',
      subject: 'Yaklaşan Randevu 1',
      body: 'Özet 1',
      sentAt: '2026-11-05T09:00:00.000Z',
    };
    const n2: ReminderNotification = {
      id: 'n2',
      userId: 'u1',
      appointmentId: 'a2',
      recipientEmail: 'u1@test.local',
      subject: 'Yaklaşan Randevu 2',
      body: 'Özet 2',
      sentAt: '2026-11-05T10:00:00.000Z',
    };
    const n3: ReminderNotification = {
      id: 'n3',
      userId: 'u2',
      appointmentId: 'a3',
      recipientEmail: 'u2@test.local',
      subject: 'Başka kullanıcı',
      body: 'Özet 3',
      sentAt: '2026-11-05T11:00:00.000Z',
    };

    await repo.create(n1);
    await repo.create(n2);
    await repo.create(n3);

    const listU1 = await repo.listByUser('u1');
    assert.deepEqual(listU1.map((n) => n.id), ['n2', 'n1']);
    assert.equal(listU1[0]?.subject, 'Yaklaşan Randevu 2');

    const listU2 = await repo.listByUser('u2');
    assert.deepEqual(listU2.map((n) => n.id), ['n3']);
  });
}

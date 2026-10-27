import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment } from '../../domain/types.js';
import { MemoryAppointmentRepository } from './appointment-repository.js';

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  userId: 'u1',
  customerId: 'c1',
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  note: '',
  ...over,
});

test('saveIfNoConflict saves the first appointment', async () => {
  const repo = new MemoryAppointmentRepository();
  assert.ok(await repo.saveIfNoConflict(appt()));
  assert.equal((await repo.findById('u1', 'a1'))?.startTime, '10:00');
});

test('saveIfNoConflict rejects an overlapping appointment without writing', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.equal(await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '10:30', endTime: '11:30' })), undefined);
  assert.equal(await repo.findById('u1', 'a2'), undefined);
});

test('saveIfNoConflict allows back-to-back appointments', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.ok(await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '11:00', endTime: '12:00' })));
});

test('saveIfNoConflict ignores cancelled appointments when checking', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt({ status: 'cancelled' }));
  assert.ok(await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '10:30', endTime: '11:30' })));
});

test('saveIfNoConflict saves a cancelled appointment even over a busy slot', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.ok(await repo.saveIfNoConflict(appt({ id: 'a2', status: 'cancelled' })));
});

test('saveIfNoConflict excludes the appointment itself when updating', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const updated = await repo.saveIfNoConflict(appt({ note: 'güncellendi' }));
  assert.equal(updated?.note, 'güncellendi');
});

test('saveIfNoConflict does not clash across users or dates', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.ok(await repo.saveIfNoConflict(appt({ id: 'a2', userId: 'u2' })));
  assert.ok(await repo.saveIfNoConflict(appt({ id: 'a3', date: '2026-11-03' })));
});

test('listByDateRange is inclusive and ordered by date then start time', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt({ id: 'a1', date: '2026-11-03', startTime: '09:00', endTime: '10:00' }));
  await repo.saveIfNoConflict(appt({ id: 'a2', date: '2026-11-02', startTime: '14:00', endTime: '15:00' }));
  await repo.saveIfNoConflict(appt({ id: 'a3', date: '2026-11-02', startTime: '08:00', endTime: '09:00' }));
  await repo.saveIfNoConflict(appt({ id: 'a4', date: '2026-11-04', startTime: '08:00', endTime: '09:00' }));
  const list = await repo.listByDateRange('u1', '2026-11-02', '2026-11-03');
  assert.deepEqual(list.map((a) => a.id), ['a3', 'a2', 'a1']);
});

test('delete removes only the owner\'s appointment', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.equal(await repo.delete('u2', 'a1'), false);
  assert.equal(await repo.delete('u1', 'a1'), true);
  assert.equal(await repo.findById('u1', 'a1'), undefined);
});

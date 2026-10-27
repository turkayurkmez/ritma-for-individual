import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import type { AppointmentInput } from '../domain/types.js';
import { MemoryAppointmentRepository } from '../repositories/memory/appointment-repository.js';
import { MemoryCustomerRepository } from '../repositories/memory/customer-repository.js';
import { AppointmentService } from './appointment-service.js';
import { CustomerService } from './customer-service.js';

const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;

async function setup() {
  const customerRepo = new MemoryCustomerRepository();
  const customers = new CustomerService(customerRepo);
  const service = new AppointmentService(new MemoryAppointmentRepository(), customerRepo);
  const ilgaz = await customers.create('u1', {
    firstName: 'Ilgaz',
    lastName: 'Demir',
    birthDate: '1990-05-17',
    gender: 'male',
  });
  const input = (over: Partial<AppointmentInput> = {}): AppointmentInput => ({
    customerId: ilgaz.id,
    date: '2026-11-02',
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    note: '',
    ...over,
  });
  return { service, customers, ilgaz, input };
}

test('create returns the appointment with the customer name', async () => {
  const { service, input } = await setup();
  const created = await service.create('u1', input({ note: 'ilk seans' }));
  assert.equal(created.customer.firstName, 'Ilgaz');
  assert.equal(created.note, 'ilk seans');
  assert.equal((await service.list('u1', '2026-11-02', '2026-11-02')).length, 1);
});

test("creating with another user's customer is 404 and creates nothing", async () => {
  const { service, input } = await setup();
  await assert.rejects(service.create('u2', input()), status(404));
  assert.deepEqual(await service.list('u2', '2026-11-01', '2026-11-30'), []);
  assert.deepEqual(await service.list('u1', '2026-11-01', '2026-11-30'), []);
});

test('a one minute overlap is a conflict, back-to-back is not', async () => {
  const { service, input } = await setup();
  await service.create('u1', input());
  await assert.rejects(service.create('u1', input({ startTime: '10:59', endTime: '12:00' })), status(409));
  await service.create('u1', input({ startTime: '11:00', endTime: '12:00' }));
});

test('a cancelled appointment frees its slot', async () => {
  const { service, input } = await setup();
  const first = await service.create('u1', input());
  await service.update('u1', first.id, { status: 'cancelled' });
  await service.create('u1', input());
});

test('un-cancelling into a taken slot is a conflict, into a free slot works', async () => {
  const { service, input } = await setup();
  const first = await service.create('u1', input());
  await service.update('u1', first.id, { status: 'cancelled' });
  const second = await service.create('u1', input());
  await assert.rejects(service.update('u1', first.id, { status: 'scheduled' }), status(409));
  await service.update('u1', second.id, { status: 'cancelled' });
  const restored = await service.update('u1', first.id, { status: 'scheduled' });
  assert.equal(restored.status, 'scheduled');
});

test('a completed appointment still blocks its slot', async () => {
  const { service, input } = await setup();
  await service.create('u1', input({ status: 'completed' }));
  await assert.rejects(service.create('u1', input()), status(409));
});

test('updating an appointment into its own slot is not a conflict', async () => {
  const { service, input } = await setup();
  const created = await service.create('u1', input());
  const updated = await service.update('u1', created.id, { note: 'not eklendi' });
  assert.equal(updated.note, 'not eklendi');
});

test('moving an appointment onto another one is a conflict', async () => {
  const { service, input } = await setup();
  await service.create('u1', input());
  const later = await service.create('u1', input({ startTime: '12:00', endTime: '13:00' }));
  await assert.rejects(service.update('u1', later.id, { startTime: '10:30' }), status(409));
});

test("a deleted customer's appointments stay visible with the name, but no new ones", async () => {
  const { service, customers, ilgaz, input } = await setup();
  await service.create('u1', input());
  await customers.softDelete('u1', ilgaz.id);
  const list = await service.list('u1', '2026-11-02', '2026-11-02');
  assert.equal(list[0]?.customer.firstName, 'Ilgaz');
  await assert.rejects(service.create('u1', input({ startTime: '15:00', endTime: '16:00' })), status(404));
});

test('a patch that leaves end before start is rejected', async () => {
  const { service, input } = await setup();
  const created = await service.create('u1', input());
  await assert.rejects(service.update('u1', created.id, { startTime: '11:30' }), status(400));
});

test('another user cannot get, update or remove the appointment', async () => {
  const { service, input } = await setup();
  const created = await service.create('u1', input());
  await assert.rejects(service.get('u2', created.id), status(404));
  await assert.rejects(service.update('u2', created.id, { note: 'x' }), status(404));
  await assert.rejects(service.remove('u2', created.id), status(404));
});

test('remove deletes the appointment permanently', async () => {
  const { service, input } = await setup();
  const created = await service.create('u1', input());
  await service.remove('u1', created.id);
  await assert.rejects(service.get('u1', created.id), status(404));
});

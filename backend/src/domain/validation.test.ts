import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from './errors.js';
import {
  isValidDate,
  isValidTime,
  parseAppointmentInput,
  parseAppointmentPatch,
  parseCustomerInput,
  parseCustomerPatch,
  parseDateRange,
} from './validation.js';

const isValidation = (e: unknown) =>
  e instanceof AppError && e.status === 400 && e.code === 'validation_error';

const customer = { firstName: 'Ilgaz', lastName: 'Demir', birthDate: '1990-05-17', gender: 'male' };
const appointment = { customerId: 'c1', date: '2026-11-02', startTime: '10:00', endTime: '11:00' };

test('isValidDate rejects days that do not exist', () => {
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidDate('2026-2-8'), false);
});

test('isValidTime rejects out-of-range and malformed times', () => {
  assert.equal(isValidTime('25:00'), false);
  assert.equal(isValidTime('9:30'), false);
  assert.equal(isValidTime('23:59'), true);
});

test('parseAppointmentInput applies defaults for status and note', () => {
  const parsed = parseAppointmentInput(appointment);
  assert.equal(parsed.status, 'scheduled');
  assert.equal(parsed.note, '');
});

test('parseAppointmentInput rejects end time not after start time', () => {
  assert.throws(() => parseAppointmentInput({ ...appointment, endTime: '10:00' }), isValidation);
  assert.throws(() => parseAppointmentInput({ ...appointment, endTime: '09:00' }), isValidation);
});

test('parseAppointmentInput rejects impossible dates, times and unknown status', () => {
  assert.throws(() => parseAppointmentInput({ ...appointment, date: '2026-02-30' }), isValidation);
  assert.throws(() => parseAppointmentInput({ ...appointment, startTime: '25:00' }), isValidation);
  assert.throws(() => parseAppointmentInput({ ...appointment, status: 'done' }), isValidation);
});

test('parseAppointmentInput rejects bodies that are not objects', () => {
  assert.throws(() => parseAppointmentInput(null), isValidation);
  assert.throws(() => parseAppointmentInput([]), isValidation);
});

test('parseAppointmentPatch validates only the given fields', () => {
  assert.deepEqual(parseAppointmentPatch({ status: 'cancelled' }), { status: 'cancelled' });
  assert.throws(() => parseAppointmentPatch({ startTime: '99:00' }), isValidation);
  assert.throws(() => parseAppointmentPatch({}), isValidation);
});

test('parseCustomerInput trims names and accepts a valid customer', () => {
  const parsed = parseCustomerInput({ ...customer, firstName: '  Ilgaz ' }, '2026-10-27');
  assert.equal(parsed.firstName, 'Ilgaz');
});

test('parseCustomerInput rejects future birth date, unknown gender and blank name', () => {
  assert.throws(() => parseCustomerInput({ ...customer, birthDate: '2026-10-28' }, '2026-10-27'), isValidation);
  assert.throws(() => parseCustomerInput({ ...customer, gender: 'x' }, '2026-10-27'), isValidation);
  assert.throws(() => parseCustomerInput({ ...customer, firstName: '   ' }, '2026-10-27'), isValidation);
  assert.throws(() => parseCustomerInput({ ...customer, birthDate: undefined }, '2026-10-27'), isValidation);
});

test('parseCustomerPatch validates given fields and requires at least one', () => {
  assert.deepEqual(parseCustomerPatch({ lastName: 'Kaya' }, '2026-10-27'), { lastName: 'Kaya' });
  assert.throws(() => parseCustomerPatch({}, '2026-10-27'), isValidation);
  assert.throws(() => parseCustomerPatch({ gender: 'x' }, '2026-10-27'), isValidation);
});

test('parseDateRange accepts up to 366 days and rejects more', () => {
  assert.deepEqual(parseDateRange('2026-01-01', '2027-01-01'), { from: '2026-01-01', to: '2027-01-01' });
  assert.throws(() => parseDateRange('2026-01-01', '2027-01-02'), isValidation);
});

test('parseDateRange rejects missing, reversed or invalid bounds', () => {
  assert.throws(() => parseDateRange(undefined, '2026-01-01'), isValidation);
  assert.throws(() => parseDateRange('2026-01-02', '2026-01-01'), isValidation);
  assert.throws(() => parseDateRange('2026-02-30', '2026-03-01'), isValidation);
});

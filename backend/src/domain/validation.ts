import { validationError } from './errors.js';
import {
  APPOINTMENT_STATUSES,
  GENDERS,
  type AppointmentInput,
  type AppointmentStatus,
  type CustomerInput,
  type Gender,
} from './types.js';

const MAX_RANGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError('İstek gövdesi bir nesne olmalıdır.');
  }
  return body as Record<string, unknown>;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw validationError(`${label} boş olamaz.`);
  }
  return value.trim();
}

function date(value: unknown, label: string): string {
  if (typeof value !== 'string' || !isValidDate(value)) {
    throw validationError(`${label} YYYY-AA-GG biçiminde geçerli bir tarih olmalıdır.`);
  }
  return value;
}

function time(value: unknown, label: string): string {
  if (typeof value !== 'string' || !isValidTime(value)) {
    throw validationError(`${label} SS:dd biçiminde geçerli bir saat olmalıdır.`);
  }
  return value;
}

function birthDate(value: unknown, today: string): string {
  const v = date(value, 'Doğum tarihi');
  if (v > today) throw validationError('Doğum tarihi gelecekte olamaz.');
  return v;
}

function gender(value: unknown): Gender {
  if (typeof value !== 'string' || !GENDERS.includes(value as Gender)) {
    throw validationError('Cinsiyet geçerli bir değer olmalıdır.');
  }
  return value as Gender;
}

function status(value: unknown): AppointmentStatus {
  if (typeof value !== 'string' || !APPOINTMENT_STATUSES.includes(value as AppointmentStatus)) {
    throw validationError('Durum geçerli bir değer olmalıdır.');
  }
  return value as AppointmentStatus;
}

function note(value: unknown): string {
  if (typeof value !== 'string') throw validationError('Not metin olmalıdır.');
  return value;
}

export function parseCustomerInput(body: unknown, today: string): CustomerInput {
  const b = asObject(body);
  return {
    firstName: requiredText(b.firstName, 'Ad'),
    lastName: requiredText(b.lastName, 'Soyad'),
    birthDate: birthDate(b.birthDate, today),
    gender: gender(b.gender),
  };
}

export function parseCustomerPatch(body: unknown, today: string): Partial<CustomerInput> {
  const b = asObject(body);
  const patch: Partial<CustomerInput> = {};
  if ('firstName' in b) patch.firstName = requiredText(b.firstName, 'Ad');
  if ('lastName' in b) patch.lastName = requiredText(b.lastName, 'Soyad');
  if ('birthDate' in b) patch.birthDate = birthDate(b.birthDate, today);
  if ('gender' in b) patch.gender = gender(b.gender);
  if (Object.keys(patch).length === 0) throw validationError('Güncellenecek en az bir alan verilmelidir.');
  return patch;
}

export function parseAppointmentInput(body: unknown): AppointmentInput {
  const b = asObject(body);
  const input: AppointmentInput = {
    customerId: requiredText(b.customerId, 'Müşteri'),
    date: date(b.date, 'Tarih'),
    startTime: time(b.startTime, 'Başlangıç saati'),
    endTime: time(b.endTime, 'Bitiş saati'),
    status: b.status === undefined ? 'scheduled' : status(b.status),
    note: b.note === undefined ? '' : note(b.note),
  };
  if (input.endTime <= input.startTime) throw validationError('Bitiş saati başlangıç saatinden sonra olmalıdır.');
  return input;
}

export function parseAppointmentPatch(body: unknown): Partial<AppointmentInput> {
  const b = asObject(body);
  const patch: Partial<AppointmentInput> = {};
  if ('customerId' in b) patch.customerId = requiredText(b.customerId, 'Müşteri');
  if ('date' in b) patch.date = date(b.date, 'Tarih');
  if ('startTime' in b) patch.startTime = time(b.startTime, 'Başlangıç saati');
  if ('endTime' in b) patch.endTime = time(b.endTime, 'Bitiş saati');
  if ('status' in b) patch.status = status(b.status);
  if ('note' in b) patch.note = note(b.note);
  if (Object.keys(patch).length === 0) throw validationError('Güncellenecek en az bir alan verilmelidir.');
  return patch;
}

export function parseDateRange(from: unknown, to: unknown): { from: string; to: string } {
  const f = date(from, 'Başlangıç tarihi (from)');
  const t = date(to, 'Bitiş tarihi (to)');
  if (t < f) throw validationError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
  const days = (Date.parse(t) - Date.parse(f)) / DAY_MS;
  if (days > MAX_RANGE_DAYS) throw validationError('Tarih aralığı en fazla 366 gün olabilir.');
  return { from: f, to: t };
}

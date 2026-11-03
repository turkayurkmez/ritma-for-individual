import { addDays, formatDayLong, parseDateString, toDateString, todayString } from './date';

test('toDateString uses local date and does not shift near midnight', () => {
  expect(toDateString(new Date(2026, 10, 3, 0, 30))).toBe('2026-11-03');
  expect(toDateString(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
});

test('addDays crosses year and month boundaries', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
});

test('parseDateString returns local midnight', () => {
  const date = parseDateString('2026-11-03');
  expect(date.getDate()).toBe(3);
  expect(date.getMonth()).toBe(10);
  expect(date.getHours()).toBe(0);
});

test('todayString formats the given moment', () => {
  expect(todayString(new Date(2026, 0, 1))).toBe('2026-01-01');
});

test('formatDayLong writes the Turkish long date with weekday', () => {
  expect(formatDayLong('2026-11-03')).toBe('3 Kasım 2026 Salı');
});

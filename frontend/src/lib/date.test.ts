import {
  addDays, formatDayLong, formatMonth, monthGrid, monthRange, parseDateString, startOfWeek,
  toDateString, todayString, weekDays,
} from './date';

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

test('startOfWeek returns the Monday (Sunday belongs to the previous week)', () => {
  expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
  expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
});

test('weekDays lists Monday to Sunday', () => {
  const days = weekDays('2026-11-04');
  expect(days).toHaveLength(7);
  expect(days[0]).toBe('2026-11-02');
  expect(days[6]).toBe('2026-11-08');
});

test('monthGrid: month starting on Sunday has 6 leading blanks and 6 rows', () => {
  const grid = monthGrid(2026, 11);
  expect(grid).toHaveLength(6);
  expect(grid[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
  expect(grid[0][6]).toBe('2026-11-01');
  expect(grid[5][0]).toBe('2026-11-30');
});

test('monthGrid: 28-day February starting on Monday is exactly 4 full rows', () => {
  const grid = monthGrid(2027, 2);
  expect(grid).toHaveLength(4);
  expect(grid.flat().every((cell) => cell !== null)).toBe(true);
});

test('monthGrid: leap-year February includes the 29th', () => {
  expect(monthGrid(2028, 2).flat()).toContain('2028-02-29');
  expect(monthGrid(2027, 2).flat()).not.toContain('2027-02-29');
});

test('monthGrid: every row has 7 cells and every day appears once', () => {
  for (const [year, month, days] of [[2026, 10, 31], [2026, 4, 30], [2026, 12, 31], [2026, 8, 31]] as const) {
    const grid = monthGrid(year, month);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid.flat().filter((cell) => cell !== null)).toHaveLength(days);
  }
});

test('monthRange and formatMonth', () => {
  expect(monthRange(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  expect(monthRange(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  expect(formatMonth(2026, 11)).toBe('Kasım 2026');
});

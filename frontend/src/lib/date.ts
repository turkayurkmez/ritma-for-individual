// Tarihler YYYY-MM-DD metni olarak taşınır ve yerel saatle işlenir.
// toISOString/Date.parse kullanılmaz: UTC'ye çevrilince gün kayar.

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

export function addDays(value: string, days: number): string {
  const date = parseDateString(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function formatDayLong(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(parseDateString(value));
}

// Hafta Pazartesi'den başlar. getDay(): Pazar 0, Pazartesi 1.
export function startOfWeek(value: string): string {
  const offset = (parseDateString(value).getDay() + 6) % 7;
  return addDays(value, -offset);
}

export function weekDays(value: string): string[] {
  const monday = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// month 1-12. Satırlar Pazartesi'den başlayan haftalardır; ay dışı hücreler null.
export function monthGrid(year: number, month: number): (string | null)[][] {
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    cells.push(toDateString(new Date(year, month - 1, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toDateString(new Date(year, month - 1, 1)),
    to: toDateString(new Date(year, month - 1, daysInMonth(year, month))),
  };
}

export function formatMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

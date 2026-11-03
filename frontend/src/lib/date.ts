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

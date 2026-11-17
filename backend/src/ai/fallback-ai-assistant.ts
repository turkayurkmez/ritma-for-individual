import type { AppointmentDraft } from '../domain/types.js';
import type { AiAssistant, ParseAppointmentInput, SummarizeCustomerHistoryInput } from './ai-assistant.js';

function addDays(dateString: string, delta: number): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + delta));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addHour(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return '10:00';
  const nextHour = Math.min(23, Number(match[1]) + 1);
  return `${String(nextHour).padStart(2, '0')}:${match[2]}`;
}

function normalizeTr(text: string): string {
  return text.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
}

export class FallbackAiAssistant implements AiAssistant {
  async parseAppointmentPrompt(input: ParseAppointmentInput): Promise<AppointmentDraft> {
    let working = input.prompt.trim();
    let date = input.referenceDate;

    const isoMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(working);
    const dotMatch = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/.exec(working);
    if (isoMatch) {
      date = isoMatch[1]!;
      working = working.replace(isoMatch[0], ' ');
    } else if (dotMatch) {
      const day = dotMatch[1]!.padStart(2, '0');
      const month = dotMatch[2]!.padStart(2, '0');
      date = `${dotMatch[3]}-${month}-${day}`;
      working = working.replace(dotMatch[0], ' ');
    } else if (/\böbür\s+gün\b/i.test(working)) {
      date = addDays(input.referenceDate, 2);
      working = working.replace(/\böbür\s+gün\b/i, ' ');
    } else if (/\byarın\b/i.test(working)) {
      date = addDays(input.referenceDate, 1);
      working = working.replace(/\byarın\b/i, ' ');
    } else if (/\bbugün\b/i.test(working)) {
      date = input.referenceDate;
      working = working.replace(/\bbugün\b/i, ' ');
    }

    let startTime = '09:00';
    let endTime = '10:00';

    const rangeMatch = /\b(?:saat\s+)?(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})(?:\s*arası)?\b/i.exec(working);
    const singleTimeMatch = /\b(?:saat\s+)?(\d{1,2})[:.](\d{2})\b/i.exec(working);
    const hourOnlyMatch = /\bsaat\s+(\d{1,2})(?:['’]?[a-zğıöşü]+)?\b/i.exec(working);

    if (rangeMatch) {
      startTime = `${rangeMatch[1]!.padStart(2, '0')}:${rangeMatch[2]}`;
      endTime = `${rangeMatch[3]!.padStart(2, '0')}:${rangeMatch[4]}`;
      working = working.replace(rangeMatch[0], ' ');
    } else if (singleTimeMatch) {
      startTime = `${singleTimeMatch[1]!.padStart(2, '0')}:${singleTimeMatch[2]}`;
      endTime = addHour(startTime);
      working = working.replace(singleTimeMatch[0], ' ');
    } else if (hourOnlyMatch) {
      startTime = `${hourOnlyMatch[1]!.padStart(2, '0')}:00`;
      endTime = addHour(startTime);
      working = working.replace(hourOnlyMatch[0], ' ');
    }

    let customerId: string | null = null;
    let suggestedCustomer: { firstName: string; lastName: string } | null = null;

    const normalizedWorking = normalizeTr(working);
    for (const c of input.customers) {
      const fullName = `${c.firstName} ${c.lastName}`;
      const normName = normalizeTr(fullName);
      if (normName && normalizedWorking.includes(normName)) {
        customerId = c.id;
        const escaped = fullName
          .split(/\s+/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('\\s+');
        const nameRegex = new RegExp(`${escaped}(?:['’]?[a-zA-ZçğıöşüÇĞİÖŞÜ]+)?`, 'i');
        working = working.replace(nameRegex, ' ');
        break;
      }
    }

    if (!customerId) {
      const capPair = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,25})\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,25})(?:['’]?[a-zA-ZçğıöşüÇĞİÖŞÜ]+)?\b/.exec(
        working,
      );
      if (capPair) {
        suggestedCustomer = { firstName: capPair[1]!, lastName: capPair[2]! };
        working = working.replace(capPair[0], ' ');
      }
    }

    const note = working
      .replace(/\b(?:için|adına|ile)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[,.\-–:\s]+|[,.\-–:\s]+$/g, '')
      .trim();

    return {
      customerId,
      suggestedCustomer,
      date,
      startTime,
      endTime,
      note,
    };
  }

  async summarizeCustomerHistory(input: SummarizeCustomerHistoryInput): Promise<string> {
    if (input.pastAppointments.length === 0) {
      return `${input.customerName} ile daha önce kayıtlı seans bulunmuyor. Yaklaşan randevu (${input.upcomingAppointment.date} ${input.upcomingAppointment.startTime}) ilk görüşme olarak planlandı.${input.upcomingAppointment.note ? ` Randevu notu: ${input.upcomingAppointment.note}` : ''}`;
    }

    const recent = [...input.pastAppointments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    const lines = recent.map((a) => `- ${a.date}: ${a.note.trim() || 'Not girilmemiş'}`);
    return [
      `${input.customerName} ile toplam ${input.pastAppointments.length} geçmiş seans kaydı bulunuyor.`,
      'Son görüşme notları:',
      ...lines,
      input.upcomingAppointment.note ? `Yaklaşan seans notu: ${input.upcomingAppointment.note}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

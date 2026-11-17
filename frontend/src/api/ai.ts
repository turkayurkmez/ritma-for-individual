import { request } from './client';
import type { AppointmentDraft } from './types';

export function parseAppointmentPrompt(prompt: string, referenceDate?: string): Promise<AppointmentDraft> {
  return request<AppointmentDraft>('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt, referenceDate },
  });
}

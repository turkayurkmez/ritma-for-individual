import type { AppointmentDraft, AppointmentStatus, Customer } from '../domain/types.js';

export interface ParseAppointmentInput {
  prompt: string;
  referenceDate: string;
  customers: Pick<Customer, 'id' | 'firstName' | 'lastName'>[];
}

export interface SummarizeCustomerHistoryInput {
  customerName: string;
  upcomingAppointment: { date: string; startTime: string; note: string };
  pastAppointments: { date: string; status: AppointmentStatus; note: string }[];
}

export interface AiAssistant {
  parseAppointmentPrompt(input: ParseAppointmentInput): Promise<AppointmentDraft>;
  summarizeCustomerHistory(input: SummarizeCustomerHistoryInput): Promise<string>;
}

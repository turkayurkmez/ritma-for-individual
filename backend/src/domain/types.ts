export type Gender = 'female' | 'male' | 'other' | 'undisclosed';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type ReminderMinutes = 15 | 30 | 60;

export const GENDERS: readonly Gender[] = ['female', 'male', 'other', 'undisclosed'];
export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['scheduled', 'completed', 'cancelled'];
export const REMINDER_MINUTES_OPTIONS: readonly ReminderMinutes[] = [15, 30, 60];

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  deletedAt: string | null;
}

export interface Appointment {
  id: string;
  userId: string;
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  note: string;
  reminderSentAt?: string | null;
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
}

export interface AppointmentInput {
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  note: string;
}

export interface AppointmentDraft {
  customerId: string | null;
  suggestedCustomer: { firstName: string; lastName: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

export interface ReminderNotification {
  id: string;
  userId: string;
  appointmentId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
}

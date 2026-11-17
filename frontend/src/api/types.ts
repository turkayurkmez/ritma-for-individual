// Alan adları api-contract/openapi.yaml ile birebir aynıdır (types.contract.test.ts bunu denetler).

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export type Gender = 'female' | 'male' | 'other' | 'undisclosed';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type ReminderMinutes = 15 | 30 | 60;

export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  deletedAt: string | null;
}

export type CustomerInput = Omit<Customer, 'id' | 'userId' | 'deletedAt'>;

export interface Appointment {
  id: string;
  userId: string;
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  note: string;
  customer: { id: string; firstName: string; lastName: string };
}

export interface AppointmentInput {
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  note?: string;
}

export interface AppointmentDraft {
  customerId: string | null;
  suggestedCustomer: { firstName: string; lastName: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

export interface ReminderSettings {
  reminderMinutesBefore: ReminderMinutes | null;
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

// Sözleşme testinin anahtarları karşılaştırması için örnek nesneler.
export const sampleUser: User = { id: 'u1', email: 'a@b.c', displayName: 'Ayşe' };

export const sampleCustomer: Customer = {
  id: 'c1',
  userId: 'u1',
  firstName: 'Ali',
  lastName: 'Veli',
  birthDate: '1990-01-01',
  gender: 'undisclosed',
  deletedAt: null,
};

export const sampleAppointment: Appointment = {
  id: 'a1',
  userId: 'u1',
  customerId: 'c1',
  date: '2026-11-03',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  note: '',
  customer: { id: 'c1', firstName: 'Ali', lastName: 'Veli' },
};

export const sampleAppointmentDraft: AppointmentDraft = {
  customerId: 'c1',
  suggestedCustomer: { firstName: 'Ali', lastName: 'Veli' },
  date: '2026-11-03',
  startTime: '14:00',
  endTime: '15:00',
  note: 'Kontrol',
};

export const sampleReminderSettings: ReminderSettings = {
  reminderMinutesBefore: 30,
};

export const sampleReminderNotification: ReminderNotification = {
  id: 'n1',
  userId: 'u1',
  appointmentId: 'a1',
  recipientEmail: 'a@b.c',
  subject: 'Yaklaşan Randevu',
  body: 'Seans özeti',
  sentAt: '2026-11-03T13:30:00.000Z',
};

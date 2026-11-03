// Alan adları api-contract/openapi.yaml ile birebir aynıdır (types.contract.test.ts bunu denetler).

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export type Gender = 'female' | 'male' | 'other' | 'undisclosed';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

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

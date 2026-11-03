import { request } from './client';
import type { Appointment, AppointmentInput } from './types';

export async function listAppointments(from: string, to: string): Promise<Appointment[]> {
  const result = await request<{ appointments: Appointment[] }>(`/appointments?from=${from}&to=${to}`);
  return result.appointments;
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const result = await request<{ appointment: Appointment }>('/appointments', { method: 'POST', body: input });
  return result.appointment;
}

export async function updateAppointment(id: string, patch: Partial<AppointmentInput>): Promise<Appointment> {
  const result = await request<{ appointment: Appointment }>(`/appointments/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  return result.appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  await request<void>(`/appointments/${id}`, { method: 'DELETE' });
}

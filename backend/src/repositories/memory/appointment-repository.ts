import type { Appointment } from '../../domain/types.js';
import type { AppointmentRepository } from '../types.js';

function cleanAppointment(appointment: Appointment): Appointment {
  const copy: Appointment = {
    id: appointment.id,
    userId: appointment.userId,
    customerId: appointment.customerId,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    note: appointment.note,
  };
  if (appointment.reminderSentAt) {
    copy.reminderSentAt = appointment.reminderSentAt;
  }
  return copy;
}

export class MemoryAppointmentRepository implements AppointmentRepository {
  private readonly appointments = new Map<string, Appointment>();

  async findById(userId: string, id: string): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    return appointment?.userId === userId ? cleanAppointment(appointment) : undefined;
  }

  async listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]> {
    return [...this.appointments.values()]
      .filter((a) => a.userId === userId && a.date >= from && a.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(cleanAppointment);
  }

  async listByCustomer(userId: string, customerId: string): Promise<Appointment[]> {
    return [...this.appointments.values()]
      .filter((a) => a.userId === userId && a.customerId === customerId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(cleanAppointment);
  }

  // Kontrol ve yazma arasında await yok: tek süreçte atomiktir.
  async saveIfNoConflict(appointment: Appointment): Promise<Appointment | undefined> {
    if (appointment.status !== 'cancelled') {
      const clash = [...this.appointments.values()].some(
        (other) =>
          other.id !== appointment.id &&
          other.userId === appointment.userId &&
          other.date === appointment.date &&
          other.status !== 'cancelled' &&
          other.startTime < appointment.endTime &&
          appointment.startTime < other.endTime,
      );
      if (clash) return undefined;
    }
    const stored = cleanAppointment(appointment);
    this.appointments.set(stored.id, stored);
    return cleanAppointment(stored);
  }

  async markReminderSent(userId: string, id: string, sentAt: string): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment?.userId !== userId) return;
    this.appointments.set(id, { ...appointment, reminderSentAt: sentAt });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const appointment = this.appointments.get(id);
    if (appointment?.userId !== userId) return false;
    return this.appointments.delete(id);
  }
}

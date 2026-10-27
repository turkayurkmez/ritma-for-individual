import { randomUUID } from 'node:crypto';
import { conflict, notFound, validationError } from '../domain/errors.js';
import type { Appointment, AppointmentInput } from '../domain/types.js';
import type { AppointmentRepository, CustomerRepository } from '../repositories/types.js';

export interface AppointmentView extends Appointment {
  customer: { id: string; firstName: string; lastName: string };
}

export class AppointmentService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly customers: CustomerRepository,
  ) {}

  async list(userId: string, from: string, to: string): Promise<AppointmentView[]> {
    const found = await this.appointments.listByDateRange(userId, from, to);
    return Promise.all(found.map((a) => this.toView(a)));
  }

  async get(userId: string, id: string): Promise<AppointmentView> {
    return this.toView(await this.find(userId, id));
  }

  async create(userId: string, input: AppointmentInput): Promise<AppointmentView> {
    await this.requireActiveCustomer(userId, input.customerId);
    return this.save({ id: randomUUID(), userId, ...input });
  }

  async update(userId: string, id: string, patch: Partial<AppointmentInput>): Promise<AppointmentView> {
    const existing = await this.find(userId, id);
    const merged: Appointment = { ...existing, ...patch };
    if (merged.endTime <= merged.startTime) {
      throw validationError('Bitiş saati başlangıç saatinden sonra olmalıdır.');
    }
    if (merged.customerId !== existing.customerId) {
      await this.requireActiveCustomer(userId, merged.customerId);
    }
    return this.save(merged);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.appointments.delete(userId, id))) throw notFound('Randevu bulunamadı.');
  }

  private async save(appointment: Appointment): Promise<AppointmentView> {
    const saved = await this.appointments.saveIfNoConflict(appointment);
    if (!saved) throw conflict('Bu saat aralığında başka bir randevunuz var.');
    return this.toView(saved);
  }

  private async find(userId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointments.findById(userId, id);
    if (!appointment) throw notFound('Randevu bulunamadı.');
    return appointment;
  }

  private async requireActiveCustomer(userId: string, customerId: string): Promise<void> {
    const customer = await this.customers.findById(userId, customerId);
    if (!customer || customer.deletedAt !== null) throw notFound('Müşteri bulunamadı.');
  }

  private async toView(appointment: Appointment): Promise<AppointmentView> {
    const customer = await this.customers.findById(appointment.userId, appointment.customerId);
    if (!customer) throw notFound('Müşteri bulunamadı.');
    return {
      ...appointment,
      customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName },
    };
  }
}

import { randomUUID } from 'node:crypto';
import type { AiAssistant } from '../ai/ai-assistant.js';
import type { ReminderMinutes, ReminderNotification } from '../domain/types.js';
import type {
  AppointmentRepository,
  CustomerRepository,
  ReminderNotificationRepository,
  UserRepository,
} from '../repositories/types.js';
import type { EmailSender } from './email-sender.js';

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalAppointmentStartMs(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y!, m! - 1, d!, hh!, mm!, 0, 0).getTime();
}

export class ReminderService {
  constructor(
    private readonly users: UserRepository,
    private readonly appointments: AppointmentRepository,
    private readonly customers: CustomerRepository,
    private readonly notifications: ReminderNotificationRepository,
    private readonly ai: AiAssistant,
    private readonly emailSender: EmailSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getSettings(userId: string): Promise<{ reminderMinutesBefore: ReminderMinutes | null }> {
    const reminderMinutesBefore = await this.users.getReminderSettings(userId);
    return { reminderMinutesBefore };
  }

  async updateSettings(
    userId: string,
    reminderMinutesBefore: ReminderMinutes | null,
  ): Promise<{ reminderMinutesBefore: ReminderMinutes | null }> {
    const updated = await this.users.updateReminderSettings(userId, reminderMinutesBefore);
    return { reminderMinutesBefore: updated };
  }

  async listSent(userId: string): Promise<ReminderNotification[]> {
    return this.notifications.listByUser(userId, 20);
  }

  async checkUserReminders(userId: string): Promise<{ sentCount: number; notifications: ReminderNotification[] }> {
    const user = await this.users.findById(userId);
    if (!user) return { sentCount: 0, notifications: [] };

    const reminderMinutes = await this.users.getReminderSettings(userId);
    if (reminderMinutes === null) {
      return { sentCount: 0, notifications: await this.listSent(userId) };
    }

    const currentNow = this.now();
    const nowMs = currentNow.getTime();
    const windowEndMs = nowMs + reminderMinutes * 60_000;

    const fromDate = formatLocalDate(currentNow);
    const toDate = formatLocalDate(new Date(windowEndMs));
    const candidates = await this.appointments.listByDateRange(userId, fromDate, toDate);

    let sentCount = 0;
    for (const appt of candidates) {
      if (appt.status !== 'scheduled' || appt.reminderSentAt) continue;
      const startMs = parseLocalAppointmentStartMs(appt.date, appt.startTime);
      if (startMs < nowMs || startMs > windowEndMs) continue;

      const customer = await this.customers.findById(userId, appt.customerId);
      if (!customer) continue;
      const customerName = `${customer.firstName} ${customer.lastName}`;

      const allCustomerAppts = await this.appointments.listByCustomer(userId, customer.id);
      const pastAppointments = allCustomerAppts
        .filter(
          (other) =>
            other.id !== appt.id &&
            other.status !== 'cancelled' &&
            (other.date < appt.date || (other.date === appt.date && other.startTime < appt.startTime)),
        )
        .map((other) => ({ date: other.date, status: other.status, note: other.note }));

      const summary = await this.ai.summarizeCustomerHistory({
        customerName,
        upcomingAppointment: { date: appt.date, startTime: appt.startTime, note: appt.note },
        pastAppointments,
      });

      const subject = `Yaklaşan Randevu: ${customerName} (${appt.date} ${appt.startTime})`;
      const sentAt = currentNow.toISOString();

      await this.emailSender.send({ to: user.email, subject, body: summary });
      await this.notifications.create({
        id: `rem-${randomUUID()}`,
        userId,
        appointmentId: appt.id,
        recipientEmail: user.email,
        subject,
        body: summary,
        sentAt,
      });
      await this.appointments.markReminderSent(userId, appt.id, sentAt);
      sentCount++;
    }

    return { sentCount, notifications: await this.listSent(userId) };
  }

  async checkAllUsers(): Promise<number> {
    const enabledUsers = await this.users.listUsersWithRemindersEnabled();
    let total = 0;
    for (const u of enabledUsers) {
      const { sentCount } = await this.checkUserReminders(u.id);
      total += sentCount;
    }
    return total;
  }
}

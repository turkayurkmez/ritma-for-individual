import type { ReminderNotification } from '../../domain/types.js';
import type { ReminderNotificationRepository } from '../types.js';

export class MemoryReminderNotificationRepository implements ReminderNotificationRepository {
  private readonly items: ReminderNotification[] = [];

  async create(notification: ReminderNotification): Promise<ReminderNotification> {
    const copy = { ...notification };
    this.items.push(copy);
    return { ...copy };
  }

  async listByUser(userId: string, limit = 20): Promise<ReminderNotification[]> {
    return this.items
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, limit)
      .map((n) => ({ ...n }));
  }
}

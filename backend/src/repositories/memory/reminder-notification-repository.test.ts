import { reminderNotificationRepositoryContract } from '../contract/reminder-notification-repository.contract.js';
import { MemoryReminderNotificationRepository } from './reminder-notification-repository.js';

reminderNotificationRepositoryContract('memory', async () => ({
  repo: new MemoryReminderNotificationRepository(),
  seedAppointment: async () => {},
}));

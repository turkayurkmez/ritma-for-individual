import { request } from './client';
import type { ReminderMinutes, ReminderNotification, ReminderSettings } from './types';

export function getReminderSettings(): Promise<ReminderSettings> {
  return request<ReminderSettings>('/settings/reminders');
}

export function updateReminderSettings(reminderMinutesBefore: ReminderMinutes | null): Promise<ReminderSettings> {
  return request<ReminderSettings>('/settings/reminders', {
    method: 'PATCH',
    body: { reminderMinutesBefore },
  });
}

export function checkRemindersNow(): Promise<{ sentCount: number; notifications: ReminderNotification[] }> {
  return request<{ sentCount: number; notifications: ReminderNotification[] }>('/reminders/check', {
    method: 'POST',
  });
}

export function listSentReminders(): Promise<ReminderNotification[]> {
  return request<ReminderNotification[]>('/reminders/sent');
}

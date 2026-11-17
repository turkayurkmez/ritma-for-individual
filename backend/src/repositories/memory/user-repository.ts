import { randomUUID } from 'node:crypto';
import type { ReminderMinutes, User } from '../../domain/types.js';
import type { UserRepository, UserWithSettings } from '../types.js';

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly byGoogleSub = new Map<string, string>();
  private readonly reminderMinutes = new Map<string, ReminderMinutes | null>();

  constructor(seed: readonly User[] = []) {
    for (const user of seed) {
      this.users.set(user.id, { ...user });
      this.reminderMinutes.set(user.id, 30);
    }
  }

  async findById(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  async findOrCreateByGoogle(input: { googleSub: string; email: string; displayName: string }): Promise<User | undefined> {
    const knownId = this.byGoogleSub.get(input.googleSub);
    if (knownId) return this.findById(knownId);
    const email = input.email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email) return undefined;
    }
    const user: User = { id: `user-${randomUUID()}`, email: input.email, displayName: input.displayName };
    this.users.set(user.id, user);
    this.byGoogleSub.set(input.googleSub, user.id);
    this.reminderMinutes.set(user.id, 30);
    return { ...user };
  }

  async getReminderSettings(userId: string): Promise<ReminderMinutes | null> {
    if (!this.reminderMinutes.has(userId)) return 30;
    return this.reminderMinutes.get(userId) ?? null;
  }

  async updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null> {
    this.reminderMinutes.set(userId, minutes);
    return minutes;
  }

  async listUsersWithRemindersEnabled(): Promise<UserWithSettings[]> {
    const result: UserWithSettings[] = [];
    for (const user of this.users.values()) {
      const minutes = this.reminderMinutes.has(user.id) ? (this.reminderMinutes.get(user.id) ?? null) : 30;
      if (minutes !== null) {
        result.push({ ...user, reminderMinutesBefore: minutes });
      }
    }
    return result;
  }
}

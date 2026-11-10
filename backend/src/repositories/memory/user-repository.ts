import { randomUUID } from 'node:crypto';
import type { User } from '../../domain/types.js';
import type { UserRepository } from '../types.js';

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly byGoogleSub = new Map<string, string>();

  constructor(seed: readonly User[] = []) {
    for (const user of seed) this.users.set(user.id, { ...user });
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
    return { ...user };
  }
}

import { randomBytes } from 'node:crypto';
import type { Session, SessionStore } from '../types.js';

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: randomBytes(32).toString('hex'),
      userId,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async find(token: string): Promise<Session | undefined> {
    return this.sessions.get(token);
  }

  async delete(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}

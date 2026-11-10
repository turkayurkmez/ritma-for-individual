import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import type { Session, SessionStore } from '../types.js';

/** Veritabanına düz jeton değil SHA-256 özeti yazılır; veritabanı sızsa bile geçerli oturum çıkmaz. */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class PostgresSessionStore implements SessionStore {
  constructor(private readonly pool: pg.Pool) {}

  async create(userId: string): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const { rows } = await this.pool.query<{ created_at: Date }>(
      'INSERT INTO sessions (token_hash, user_id) VALUES ($1, $2) RETURNING created_at',
      [digest(token), userId],
    );
    return { token, userId, createdAt: rows[0].created_at.toISOString() };
  }

  async find(token: string): Promise<Session | undefined> {
    const { rows } = await this.pool.query<{ user_id: string; created_at: Date }>(
      'SELECT user_id, created_at FROM sessions WHERE token_hash = $1',
      [digest(token)],
    );
    return rows[0] ? { token, userId: rows[0].user_id, createdAt: rows[0].created_at.toISOString() } : undefined;
  }

  async delete(token: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [digest(token)]);
  }

  async deleteByUserIds(userIds: readonly string[]): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE user_id = ANY($1::text[])', [userIds]);
  }
}

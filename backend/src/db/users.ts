import type pg from 'pg';
import type { User } from '../domain/types.js';

/** Kullanıcıları id'ye göre ekler ya da günceller (yabancı anahtarların tutması için). */
export async function upsertUsers(pool: pg.Pool, users: readonly User[]): Promise<void> {
  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
      [user.id, user.email, user.displayName],
    );
  }
}

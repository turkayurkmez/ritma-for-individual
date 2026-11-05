// Veritabanı bağlantısını dener: `npm run db:check` (backend/ içinde).
// Bağlantı adresini asla yazdırmaz.
import pg from 'pg';
import { loadConfig } from '../src/config.js';

const { databaseUrl } = loadConfig(process.env);
if (!databaseUrl) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasını kontrol et.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  const { rows } = await client.query('SELECT version() AS version, current_database() AS db');
  console.log(`Bağlantı başarılı. Veritabanı: ${rows[0].db}`);
  console.log(rows[0].version);
} catch (error) {
  console.error('Bağlantı başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

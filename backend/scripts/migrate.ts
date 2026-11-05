// Bekleyen şema değişikliklerini uygular: `npm run db:migrate` (backend/ içinde).
// Bağlantı adresini asla yazdırmaz.
import { loadConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { MIGRATIONS_DIR, runMigrations } from '../src/db/migrate.js';

const { databaseUrl } = loadConfig(process.env);
if (!databaseUrl) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasını kontrol et.');
  process.exit(1);
}

const pool = createPool(databaseUrl);
try {
  const applied = await runMigrations(pool, MIGRATIONS_DIR);
  console.log(applied.length ? `Uygulanan migration'lar: ${applied.join(', ')}` : 'Yeni migration yok.');
} catch (error) {
  console.error('Migration başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

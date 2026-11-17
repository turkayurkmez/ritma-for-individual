import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { buildDeps } from './deps.js';

const config = loadConfig(process.env);
// Hem src/ (geliştirme) hem dist/ (derlenmiş) bir üst klasörde backend/, onun da üstünde repo kökü vardır.
const staticDir = path.resolve(import.meta.dirname, '../../frontend/dist');
const specPath = path.resolve(import.meta.dirname, '../../api-contract/openapi.yaml');

const REMINDER_CHECK_INTERVAL_MS = 10 * 60 * 1000;

try {
  const deps = await buildDeps(process.env);
  if (deps.reminders) {
    setInterval(() => {
      void deps.reminders!.checkAllUsers().catch((err) => {
        console.error('Hatırlatma kontrolü sırasında hata:', err instanceof Error ? err.message : err);
      });
    }, REMINDER_CHECK_INTERVAL_MS).unref();
  }
  createApp({ ...deps, staticDir, docs: { specPath } }).listen(config.port, () => {
    console.log(`Ritma http://localhost:${config.port} adresinde çalışıyor`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

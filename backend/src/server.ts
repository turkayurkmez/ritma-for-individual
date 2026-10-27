import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { buildDeps } from './deps.js';

const config = loadConfig(process.env);
// Hem src/ (geliştirme) hem dist/ (derlenmiş) bir üst klasörde backend/, onun da üstünde repo kökü vardır.
const staticDir = path.resolve(import.meta.dirname, '../../web');

createApp({ ...buildDeps(process.env), staticDir }).listen(config.port, () => {
  console.log(`Ritma http://localhost:${config.port} adresinde çalışıyor`);
});

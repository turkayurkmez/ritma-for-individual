# Antigravity Proje Kuralları (GEMINI.md)

Bu projedeki tüm mimari kararlar, teknoloji kısıtları, ön yüz/arka uç kuralları, test standartları ve çalışma düzeni için tek doğruluk kaynağı [CLAUDE.md](./CLAUDE.md) dosyasıdır. Herhangi bir kuralı kontrol etmen gerektiğinde doğrudan `CLAUDE.md` dosyasını esas al:

@[CLAUDE.md](./CLAUDE.md)

## Güvenlik Kuralları

- `.env` ve `.env.*` (ör. `backend/.env`, `.env.local`, `.env.production` vb.) dosyalarını **kesinlikle okuma, düzenleme veya içeriğini yazdırma** (`read_file`, `edit_file`, `write_file`, `run_command` dahil).
- Ortam değişkenlerinin yapısını kontrol etmek gerektiğinde yalnızca `.env.example` (`backend/.env.example`) dosyasını oku.

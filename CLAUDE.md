# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma, serbest çalışan hizmet sağlayıcılar (danışman, koç, eğitmen, diyetisyen vb.) için planlanan bir randevu ve müşteri takip sistemidir. Şu an iki parça var: `web/` altında tanıtım sayfası (amaç ilgi ölçmek) ve `backend/` altında bellek tabanlı API (yönetim paneli arayüzü henüz yok). Arayüz metinleri Türkçedir.

## Teknoloji

- Ön yüz (`web/`) sadece HTML, CSS ve JavaScript kullanır. Backend (`backend/`) Node.js + Express + TypeScript ile yazılır.
- Ön yüzde framework, derleme aracı veya paket yöneticisi yoktur.
- Mevcut sayfa tek dosyadır (`web/index.html`), stiller dosyanın içindedir.

## Tasarım

- Yön: "keskin ve teknik" (indigo vurgu, 2px kenarlık, sert gölge, monospace başlıklar). Değerler `web/index.html` içindeki `:root` değişkenlerinde.
- Tasarım belgesi: `docs/superpowers/specs/`, uygulama planı: `docs/superpowers/plans/`.

## Komutlar

Ön yüz için kurulum, derleme, lint veya test komutu yoktur. Doğrulama için:

- Görsel kontrol: `chrome.exe --headless=new --screenshot=<dosya.png> --window-size=1200,900 file:///.../web/index.html`. Başsız Chrome 500px'ten dar pencere açmaz; telefon genişliğini 360px'lik bir `<iframe>` içinde ölç.
- `validateSignup` / `sendSignup` global fonksiyonlar; `node` ile `vm` içinde çalıştırılabilir. Geçici betikleri projeye değil scratchpad'e koy.
- Sayfayı görmek için `web/index.html` dosyasını tarayıcıda aç ya da backend'i çalıştırıp `http://localhost:3000` adresine git (aşağıda).

## Backend

`backend/` Node.js + Express + TypeScript API'sidir; veriler bellekte tutulur (sunucu yeniden başlayınca silinir). Tasarım: `docs/superpowers/specs/2026-10-27-ritma-backend-design.md`, API sözleşmesi: `api-contract/openapi.yaml`.

- Komutlar (`backend/` içinde): `npm test` (node:test + tsx), `npm run dev` (izleme modunda çalıştırır), `npm run build` (`dist/`), `npm start`.
- Sunucu `web/` klasörünü de servis eder: `npm run dev`, sonra `http://localhost:3000`. `PORT` ile port değişir.
- Demo hesaplar: `ayse@ritma.demo` / `demo-ayse-123` ve `mehmet@ritma.demo` / `demo-mehmet-123`. `DEMO_ACCOUNTS_ENABLED=true|false` ile açılır/kapanır; `NODE_ENV=production` iken varsayılan kapalıdır.
- API `/api/v1` altındadır. Oturum jetonu `Authorization: Bearer <token>` başlığı ya da `ritma_session` çerezi ile gelir. Hata biçimi: `{ "error": { "code", "message" } }` (`validation_error` 400, `unauthorized` 401, `not_found` 404, `conflict` 409).
- Swagger arayüzü `http://localhost:3000/docs` adresindedir (`swagger-ui-dist`, `api-contract/openapi.yaml`'ı okur). `NODE_ENV=production` iken kapalıdır.
- Tarayıcıdan API testi (Chrome eklentisiyle): `http://localhost:3000` açıkken sayfa içinde `fetch('/api/v1/...')` çalıştır; aynı origin olduğu için çerez otomatik gider (`ritma_session` HttpOnly, `document.cookie`'de görünmez). İkinci kullanıcıyı sınamak için çerezi ezmemesi adına Bearer jeton + `credentials: 'omit'` kullan.
- Yeni bir rota eklenince `api-contract/openapi.yaml` güncellenir (`contract.test.ts` rota listesini kontrol eder).
- Backend'i TDD ile geliştir: önce başarısız test, sonra kod.
- `npm test` (tsx) tipleri denetlemez ve test dosyaları `tsc` derlemesine girmez; tip hatası için testten ayrı `npm run build` çalıştır.
- Tek test dosyası: `node --import tsx --test src/http/docs-routes.test.ts` (`backend/` içinde). TDD'de kırmızı adımını bununla doğrula, bitirmeden önce tüm `npm test`'i çalıştır.
- HTTP testleri `src/test-support.ts` içindeki `startTestServer()` / `buildTestDeps()` ile yazılır (gerçek sunucu + fetch, mock yok).
- Yerleşim (`backend/src/`): `http/` rotalar ve hata işleyici, `services/` iş kuralları, `repositories/memory/` bellek depoları, `auth/` kimlik sağlayıcı ve oturum, `domain/` ortak tipler ve hatalar. Bağımlılıklar `AppDeps` (`app.ts`) ile verilir; gerçek sunucu için `deps.ts` (`buildDeps`), testler için `test-support.ts` kurar. Yeni isteğe bağlı özellikler (örn. `staticDir`, `docs`) `AppDeps`'e eklenir ve `server.ts`'ten geçirilir.
- Sunucuyu arka planda (`npm run dev`) başlatıp tarayıcıya gitmeden önce `Ritma http://localhost:3000 adresinde çalışıyor` satırını bekle (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`); hazır olmadan açılan sekme hata sayfası gösterir. İş bitince sunucuyu ve sekmeyi kapat.
- Tırnak/apostrof içeren uzun dosyaları `cat <<EOF` ile değil Write aracıyla yaz; kabuk komutu ayrıştırma hatasıyla hiç dosya yazmadan çökebilir.

## Kurallar

- Dosya ve klasör adları İngilizce olur (örnek: `index.html`, `styles.css`, `script.js`).
- Ön yüz (`web/`) için sadece HTML, CSS ve JS yaz. Backend (`backend/`) TypeScript ile yazılır. Başka teknoloji gerekirse önce kullanıcıya sor.
- Renkler `:root` içindeki CSS değişkenlerinden gelir. Sayfa şu an yalnızca açık temadadır (koyu tema bloğu PR #1 ile kaldırıldı).
- Sayfa telefon ekranında da düzgün görünmelidir.
- Kullanıcıya görünen metinler Türkçe, açıklamalar sade bir dille yazılır.
- Form `web/index.html` sonundaki `FORM_ENDPOINT` sabitine POST eder. Sabit boşken form hata gösterir (kayıt kaybolmasın diye başarı göstermez). Form servisi seçilmedi; yayından önce adresi yazın. Harici servis eklemek için önce sor.

## Yasaklar

- Türkçe dosya veya klasör adı verme.
- Sormadan framework veya kütüphane (React, Tailwind, jQuery vb.) ekleme.
- Sormadan commit atma veya push yapma.

## Çalışma düzeni

- Özellik çalışması ayrı bir branch'te yapılır (`feat/...`) ve PR ile `main`'e girer; `main`'e doğrudan commit atma.
- Büyük işler `docs/superpowers/specs/` (tasarım) → `docs/superpowers/plans/` (plan) sırasıyla yürür; `.superpowers/` git'in dışında tutulan geçici çalışma alanıdır.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma, serbest çalışan hizmet sağlayıcılar (danışman, koç, eğitmen, diyetisyen vb.) için planlanan bir randevu ve müşteri takip sistemidir. Şu an iki parça var: `frontend/` altında ön yüz (tanıtım sayfası ve yönetim paneli; plan: `docs/superpowers/plans/2026-11-03-ritma-frontend.md`) ve `backend/` altında bellek tabanlı API. Arayüz metinleri Türkçedir.

## Teknoloji

- Ön yüz (`frontend/`) React + TypeScript + Vite ile yazılır (tasarım: `docs/superpowers/specs/2026-11-03-ritma-frontend-design.md`). Backend (`backend/`) Node.js + Express + TypeScript ile yazılır.
- Ön yüz bağımlılıkları yalnızca: `react`, `react-dom`, `react-router`; geliştirme için `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`, `@types/react`, `@types/react-dom`. Listedışı kütüphane (örn. `user-event`, `jest-dom`, `@types/node`) için önce sor.

## Ön yüz rotaları

- `/` tanıtım, `/giris` giriş. `/panel` (günlük), `/panel/hafta`, `/panel/ay`, `/panel/musteriler` giriş ister (`RequireAuth`; oturum yoksa `/giris`'e yönlenir).
- Günlük, haftalık ve aylık görünüm gün/hafta/ayı `?tarih=YYYY-MM-DD` sorgu parametresinden okur (yoksa bugün); haftalık ve aylıkta bir güne tıklamak `/panel?tarih=...`'e gider. Hafta Pazartesi'den başlar.
- Yerleşim (`frontend/src/`): `api/` (istemci ve uç noktalar), `auth/` (oturum), `lib/` (tarih, etiket, `useApi`), `components/` (ortak modal), `pages/<ekran>/` (sayfa + kendi `.css`'i ve testi).
- Testler `fireEvent` ile yazılır; ağ `test-utils.tsx` içindeki `stubFetch` ile taklit edilir, ekranlar `renderApp` ile çizilir. Dosya okuyan testler Vite `?raw` ile yazılır (`node:fs` yok).
- Tarih yardımcıları `frontend/src/lib/date.ts` içindedir; tarih metni üretmek/çözmek için `toISOString()`/`Date.parse` kullanma (gün kayar).

## Tasarım

- Yön: "keskin ve teknik" (indigo vurgu, 2px kenarlık, sert gölge, monospace başlıklar). Değerler `frontend/src/styles/tokens.css` içindeki `:root` değişkenlerinde. Stiller HTML/JSX dışında ayrı `.css` dosyalarındadır (sayfa/bileşen yanında, `landing-…` gibi önekli sınıf adlarıyla).

## Komutlar

- Ön yüz (`frontend/` içinde): `npm run dev` (Vite, `http://localhost:5173`; `/api` ve `/docs` istekleri 3000'e yönlenir, backend ayrıca çalışmalı), `npm test` (Vitest), `npm run build` (tip kontrolü + `dist/`).

- Görsel kontrol: backend çalışırken `chrome.exe --headless=new --hide-scrollbars --virtual-time-budget=4000 --screenshot=<dosya.png> --window-size=1200,2600 http://localhost:3000/` (`--virtual-time-budget` olmadan React henüz çizilmemiş olur). Başsız Chrome 500px'ten dar pencere açmaz; telefon genişliğini 360px'lik bir `<iframe>` içinde ölç. İframe `file://` sayfasından `http://` adresini yüklemez (boş çıkar): sarmalayıcı sayfayı geçici olarak `frontend/dist/` içine koyup `http://localhost:3000/<ad>.html` ile aç, sonra sil.
- Geçici betikleri ve ekran görüntülerini projeye değil scratchpad'e koy.

## Backend

`backend/` Node.js + Express + TypeScript API'sidir; veriler bellekte tutulur (sunucu yeniden başlayınca silinir). Tasarım: `docs/superpowers/specs/2026-10-27-ritma-backend-design.md`, API sözleşmesi: `api-contract/openapi.yaml`.

- Komutlar (`backend/` içinde): `npm test` (node:test + tsx), `npm run dev` (izleme modunda çalıştırır), `npm run build` (`dist/`), `npm start`.
- Sunucu derlenmiş ön yüzü (`frontend/dist`) servis eder (önce `cd frontend && npm run build`): `npm run dev`, sonra `http://localhost:3000`. `PORT` ile port değişir. `/api` ve `/docs` dışındaki uzantısız GET istekleri `index.html` döndürür (SPA yedek rotası, `http/spa-fallback.ts`); eksik dosyalar (örn. `/assets/yok.js`) 404 kalır.
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
- Sunucuyu arka planda (`npm run dev`) başlatıp tarayıcıya gitmeden önce `Ritma http://localhost:3000 adresinde çalışıyor` satırını bekle (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`); hazır olmadan açılan sekme hata sayfası gösterir. `npm run dev` izleme modunda olduğundan dosya değişince sunucu yeniden başlar ve bellekteki oturum/veri silinir; tarayıcı testinde tekrar giriş gerekebilir. İş bitince sunucuyu ve sekmeyi kapat.
- Tırnak/apostrof içeren uzun dosyaları `cat <<EOF` ile değil Write aracıyla yaz; kabuk komutu ayrıştırma hatasıyla hiç dosya yazmadan çökebilir.

## Kurallar

- Dosya ve klasör adları İngilizce olur (örnek: `index.html`, `styles.css`, `script.js`).
- Ön yüz (`frontend/`) React + TypeScript, backend (`backend/`) TypeScript ile yazılır. Başka teknoloji gerekirse önce kullanıcıya sor.
- Renkler `frontend/src/styles/tokens.css` içindeki `:root` CSS değişkenlerinden gelir. Sayfa şu an yalnızca açık temadadır (koyu tema bloğu PR #1 ile kaldırıldı).
- Sayfa telefon ekranında da düzgün görünmelidir.
- Kullanıcıya görünen metinler Türkçe, açıklamalar sade bir dille yazılır.
- Kayıt formu `frontend/src/pages/landing/signup.ts` içindeki `FORM_ENDPOINT` sabitine POST eder. Sabit boşken form hata gösterir (kayıt kaybolmasın diye başarı göstermez). Form servisi seçilmedi; yayından önce adresi yazın. Harici servis eklemek için önce sor.

## Yasaklar

- Türkçe dosya veya klasör adı verme.
- Sormadan framework veya kütüphane (Tailwind, jQuery, TanStack Query vb.; Teknoloji bölümündeki ön yüz listesi dışında her şey) ekleme.
- Sormadan commit atma veya push yapma.

## Çalışma düzeni

- Özellik çalışması ayrı bir branch'te yapılır (`feat/...`) ve PR ile `main`'e girer; `main`'e doğrudan commit atma.
- Büyük işler `docs/superpowers/specs/` (tasarım) → `docs/superpowers/plans/` (plan) sırasıyla yürür; `.superpowers/` git'in dışında tutulan geçici çalışma alanıdır.

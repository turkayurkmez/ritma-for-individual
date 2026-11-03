# Ritma Ön Yüz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tanıtım sayfası dahil tüm arayüzü tek bir React + TypeScript + Vite projesinden sunmak ve backend API'sini kullanan bir yönetim paneli (giriş, günlük/haftalık/aylık randevular, müşteriler) kurmak.

**Architecture:** `frontend/` bağımsız bir Vite projesidir. Express derlenmiş `frontend/dist`'i servis eder (tek origin, CORS yok); `/api` ve `/docs` dışındaki uzantısız GET istekleri `index.html` döndürür (SPA fallback). Geliştirmede Vite (5173) `/api` ve `/docs`'u 3000'e yönlendirir. Oturum `HttpOnly` çerezle taşınır; ön yüz jeton saklamaz.

**Tech Stack:** React, react-router, TypeScript, Vite, Vitest + Testing Library + jsdom. Düz CSS (ayrı `.css` dosyaları).

**Spec:** `docs/superpowers/specs/2026-11-03-ritma-frontend-design.md`

## Global Constraints

- Bağımlılıklar yalnızca: `react`, `react-dom`, `react-router`; geliştirme: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`, `@types/react`, `@types/react-dom`. Başka kütüphane (Tailwind, UI kiti, TanStack Query, takvim kütüphanesi, Playwright, `user-event`, `jest-dom`) eklenmez; gerekirse önce kullanıcıya sorulur. Etkileşim testlerinde `fireEvent` kullanılır. Router bileşenleri `react-router` paketinden içe aktarılır.
- Stiller HTML ve JSX'in dışında ayrı `.css` dosyalarında; `<style>` ve `style=""` yok. Her sayfa/bileşen yanında kendi `.css` dosyasını taşır, sınıf adları bileşene özgü önek alır (`.weekly-…`). Renkler yalnızca `styles/tokens.css` içindeki `:root` değişkenlerinden gelir.
- Dosya ve klasör adları İngilizce. Arayüz metinleri Türkçe, sade dille.
- Tarihler `YYYY-MM-DD` metni, saatler `HH:mm`; yerel saatle işlenir. `toISOString()` ve `Date.parse` ile tarih metni üretmek/çözmek yasak (gün kayar). Hafta Pazartesi'den başlar.
- `alert`, `confirm`, `prompt` kullanılmaz; onay ve formlar sayfa içi modaldır.
- Backend hata biçimi `{ "error": { "code", "message" } }`; `message` Türkçedir ve olduğu gibi gösterilir. Sunucuya ulaşılamazsa metin: `Sunucuya ulaşılamadı.`
- Etiketler: cinsiyet `female` Kadın, `male` Erkek, `other` Diğer, `undisclosed` Belirtmek istemiyorum; durum `scheduled` Planlandı, `completed` Tamamlandı, `cancelled` İptal.
- Her ekranda üç durum bulunur: yükleniyor, boş, hata ("Yeniden dene" düğmesiyle).
- Ön yüz testlerinde `fetch` ağ sınırında taklit edilir (`test-utils.tsx` içindeki `stubFetch`). Her görev sonunda `npm test` ve `npm run build` (tip kontrolü dahil) `frontend/` içinde geçmelidir.
- Tarayıcı doğrulamasında arka planda başlatılan sunucunun hazır olması beklenir (`Ritma http://localhost:3000 adresinde çalışıyor` satırı ya da `curl` ile 200); iş bitince sunucu ve sekme kapatılır.
- Her görev kendi `feat/frontend-...` dalında çalışır ve PR ile `main`'e girer. Commit atma ve push yapma kullanıcının açık onayına bağlıdır; plandaki commit adımlarını yürütücü, kullanıcıdan commit izni alındıktan sonra uygular.

## Review Focus

- **Derin bağlantıyı yenileme:** Tarayıcıda `/panel/hafta` açıkken sayfa yenilenince sunucu 404 değil `index.html` dönmeli, oturum yoksa kullanıcı `/giris`'e gitmeli. (Görev 1 ve 3 testleri)
- **Gün kayması:** Gece yarısına yakın yerel saatte (`00:30`) ve ay/yıl sınırında (`2026-12-31` + 1 gün) tarih bir gün kaymamalı. (Görev 5 testleri)
- **Ay ızgarası kenar durumları:** Ayın 1'i Pazar ya da Pazartesi olduğunda, 28/29/30/31 günlük aylarda ve artık yıl Şubat'ında ızgara doğru satır ve boş hücre sayısı vermeli. (Görev 6 testleri)
- **Eski yanıtın yenisini ezmesi:** Arama kutusuna hızlı yazarken geç gelen eski yanıt, daha yeni sonucu ekrandan silmemeli. (Görev 3 `useApi` ve Görev 4 testleri)
- **Çift gönderim:** Kaydet düğmesine art arda basınca tek istek gitmeli (düğme istek sürerken kapalı). Aksi halde iki müşteri ya da kendi kendine 409 oluşur. (Görev 4 ve 5 testleri)

---

### Task 1: İskelet ve sunum

**Dal:** `feat/frontend-scaffold`

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/.gitignore` (`node_modules`, `dist`)
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/test-setup.ts`
- Create: `frontend/src/styles/tokens.css` (`web/index.html` içindeki `:root` bloğunun aynısı), `frontend/src/styles/base.css` (aynı dosyadaki `*`, `html`, `body`, `.container` ve tipografi kuralları)
- Create: `backend/src/http/spa-fallback.ts`, `backend/src/http/spa-fallback.test.ts`
- Modify: `backend/src/app.ts` (static'ten sonra fallback), `backend/src/server.ts` (`staticDir` = `../../frontend/dist`), `CLAUDE.md` (Teknoloji, Komutlar, Backend bölümleri)

**Interfaces:**
- Produces: `createSpaFallback(staticDir: string): express.RequestHandler` — `GET`/`HEAD` isteğinde yol `/api` ya da `/docs` ile başlamıyorsa ve dosya uzantısı yoksa `staticDir/index.html` gönderir, aksi halde `next()`.
- Produces: `App(): JSX.Element` — `/` için geçici `Landing` yer tutucusu ("Ritma" başlığı), bilinmeyen yol için `Sayfa bulunamadı.`. `main.tsx` `BrowserRouter` ile sarar; testler `MemoryRouter` kullanır.
- Produces: `vite.config.ts` — `server.proxy`: `/api` ve `/docs` → `http://localhost:3000`; `test`: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test-setup.ts'`, `css: false`.
- Produces: `package.json` betikleri `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `test` (`vitest run`).

- [ ] **Step 1: Backend için başarısız testler** (`spa-fallback.test.ts`, geçici klasörde `index.html` olan `buildTestDeps({ staticDir })` ile)
  - `serves index.html for a client-side route`: `GET /panel/hafta` → 200, gövde `index.html` içeriği.
  - `keeps the JSON 404 for unknown api paths`: `GET /api/v1/yok` → 404, `error.code === 'not_found'`.
  - `does not fall back for missing files`: `GET /assets/yok.js` → 404.
  - `does not serve the app under /docs when docs are off`: `GET /docs/` → 404.
  - `does not fall back for non-GET requests`: `POST /panel` → 404.
- [ ] **Step 2: Çalıştır, başarısız olduğunu doğrula** — `cd backend && node --import tsx --test src/http/spa-fallback.test.ts`; beklenen: ilk test FAIL (404 !== 200).
- [ ] **Step 3: `createSpaFallback` ve `app.ts` bağlantısı** — `express.static`'ten hemen sonra `app.use(createSpaFallback(staticDir))`, yalnızca `deps.staticDir` varken. `server.ts`'te `staticDir = path.resolve(import.meta.dirname, '../../frontend/dist')`.
- [ ] **Step 4: Çalıştır** — aynı komut PASS; ardından `cd backend && npm test && npm run build` (mevcut `e2e.test.ts` kendi `web/` yolunu kullandığı için etkilenmez).
- [ ] **Step 5: Ön yüz iskeleti** — `frontend/` dosyalarını kur, `npm install`. Başarısız test önce: `App.test.tsx` → `renders the landing placeholder at /` (`getByText('Ritma')`) ve `shows a not-found message for unknown paths` (`/yok` → `Sayfa bulunamadı.`). `npm test` ile FAIL'i gör, `App.tsx`'i yaz, PASS'ı gör, `npm run build` hatasız.
- [ ] **Step 6: CLAUDE.md güncelle** — Teknoloji (ön yüz React + TS + Vite; "framework yok" kuralı bu planın bağımlılık listesine çekilir), Komutlar (ön yüz `npm run dev/test/build`, geliştirmede `http://localhost:5173`), Backend (statik servis `frontend/dist`, SPA fallback). `web/` bu görevde hâlâ duruyor; Görev 2'de kalkacak.
- [ ] **Step 7: Tarayıcı doğrulaması** — `frontend` derlenir, backend başlatılır (hazır olması beklenir), `http://localhost:3000/` ve `http://localhost:3000/panel/hafta` açılır; ikisi de "Ritma" yer tutucusunu göstermeli (404 değil). Dev modunda `http://localhost:5173/api/v1/health` 200 dönmeli (proxy). Sunucu ve sekme kapatılır.
- [ ] **Step 8: Commit** — `git add frontend backend/src CLAUDE.md && git commit -m "feat: ön yüz iskeleti ve SPA fallback"` (izin alındıktan sonra).

---

### Task 2: Tanıtım sayfası taşınır, `web/` kalkar

**Dal:** `feat/frontend-landing`

**Files:**
- Create: `frontend/src/pages/landing/Landing.tsx`, `Landing.css`, `SignupForm.tsx`, `SignupForm.css`, `signup.ts`, `signup.test.ts`, `SignupForm.test.tsx`
- Modify: `frontend/src/App.tsx` (yer tutucu yerine `Landing`), `frontend/index.html` (`<title>` ve `description` meta'sı eski sayfadan), `backend/src/e2e.test.ts` (satır 8 ve 75–80: `web/` yerine test içinde oluşturulan geçici klasör), `CLAUDE.md` (Proje özeti, Tasarım, Komutlar, Kurallar: `web/` ve `FORM_ENDPOINT` yeni yolları)
- Delete: `web/index.html` (görünüm eşitliği doğrulandıktan sonra)

**Interfaces:**
- Produces: `signup.ts`: `export const FORM_ENDPOINT: string` (`""`), `type SignupValues = { name: string; email: string; job: string }`, `type SignupErrors = Partial<Record<keyof SignupValues, string>>`, `validateSignup(values: SignupValues): SignupErrors`, `sendSignup(values: SignupValues, endpoint?: string): Promise<void>` (varsayılan `FORM_ENDPOINT`). Davranış ve mesajlar `web/index.html` satır 301–323 ile birebir aynıdır (`Lütfen adınızı ve soyadınızı yazın.`, `Geçerli bir e-posta adresi yazın.`, `Lütfen mesleğinizi seçin.`, `Form servisi henüz bağlanmadı.`, `Servis hata döndü.`).
- Produces: `SignupForm({ endpoint }: { endpoint?: string }): JSX.Element` — davranış `web/index.html` satır 325–367'deki betikle aynı: hatalı alanlarda `aria-invalid` + `role="alert"` mesajı, ilk hatalı alana odak, gönderirken düğme kapalı, başarıda form gizlenir ve `Teşekkürler! Listeye eklendin, Ritma hazır olduğunda sana haber vereceğiz.`, hatada `Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.`
- Produces: `Landing()` — eski sayfanın hero, sorun-çözüm, nasıl çalışır, erken erişim bölümleri ve alt bilgisi aynı metinlerle; ek olarak `/giris`'e giden "Giriş" bağlantısı (`Link` bileşeni).

- [ ] **Step 1: Önce eski sayfanın referans ekran görüntülerini al** — `chrome.exe --headless=new --screenshot=<scratchpad>/old-1200.png --window-size=1200,900 file:///.../web/index.html`; telefon için 360px'lik `<iframe>` içeren geçici bir sayfayı scratchpad'e koyup aynısı. Bunlar proje dışında kalır.
- [ ] **Step 2: Başarısız testler** — `signup.test.ts`: boş değerler üç hata verir; geçerli değerler `{}` döner; e-posta `a@b` (nokta yok) geçersiz; `sendSignup` boş endpoint'te `Form servisi henüz bağlanmadı.` ile reddeder ve `fetch` çağrılmaz; endpoint verilince JSON `POST` eder (`Content-Type`, `Accept`, gövde); `!ok` yanıtta `Servis hata döndü.` ile reddeder. `SignupForm.test.tsx`: boş gönderimde üç mesaj görünür ve ad alanı odaklanır; `FORM_ENDPOINT` boşken geçerli gönderim başarı değil hata mesajını gösterir ve düğme yeniden açılır; `endpoint="/x"` + 200 stub'ı ile başarı metni görünür ve form gizlenir. `npm test` → FAIL.
- [ ] **Step 3: `signup.ts`, `SignupForm.tsx`, `Landing.tsx` ve CSS dosyalarını yaz** — HTML/CSS eski sayfadan taşınır; `:root` zaten `tokens.css`'te, bölüm stilleri `Landing.css`'e, form stilleri `SignupForm.css`'e gider. `npm test` PASS, `npm run build` hatasız.
- [ ] **Step 4: Backend e2e testini `web/`'e bağımlı olmaktan çıkar** — `e2e.test.ts` içindeki statik servis testi geçici bir klasördeki `index.html` ile çalışır (Görev 1'deki testlerle aynı yöntem). `cd backend && npm test` PASS.
- [ ] **Step 5: Görünüm eşitliği** — `frontend` derlenir, backend başlatılır; `http://localhost:3000/` için aynı iki ekran görüntüsü alınır ve eski olanlarla karşılaştırılır (Read ile görsel olarak). Fark varsa CSS düzeltilir. Tarayıcıda formun hata durumu elle denenir. Sunucu kapatılır.
- [ ] **Step 6: `web/` sil, CLAUDE.md güncelle** — `git rm -r web`; CLAUDE.md'den `web/` ve başsız Chrome `file:///.../web/index.html` notları yeni yapıya göre düzeltilir (`FORM_ENDPOINT` artık `frontend/src/pages/landing/signup.ts` içinde).
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: tanıtım sayfası ön yüze taşındı"` (izin alındıktan sonra).

---

### Task 3: API istemcisi, oturum, giriş, panel iskeleti

**Dal:** `feat/frontend-auth`

**Files:**
- Create: `frontend/src/api/types.ts`, `client.ts`, `client.test.ts`, `auth.ts`, `types.contract.test.ts`
- Create: `frontend/src/lib/useApi.ts`, `useApi.test.tsx`
- Create: `frontend/src/auth/AuthProvider.tsx`, `RequireAuth.tsx`, `auth.test.tsx`
- Create: `frontend/src/pages/login/Login.tsx`, `Login.css`, `Login.test.tsx`
- Create: `frontend/src/pages/panel/PanelLayout.tsx`, `PanelLayout.css`, `PanelLayout.test.tsx`
- Create: `frontend/src/test-utils.tsx`
- Modify: `frontend/src/App.tsx` (rotalar: `/giris`, `/panel` altında `RequireAuth` + `PanelLayout`; alt rotalar `index`, `hafta`, `ay`, `musteriler` geçici yer tutucu sayfalarla)

**Interfaces:**
- Produces: `types.ts`: `User { id; email; displayName }`, `Gender = 'female'|'male'|'other'|'undisclosed'`, `AppointmentStatus = 'scheduled'|'completed'|'cancelled'`, `Customer { id; userId; firstName; lastName; birthDate; gender; deletedAt: string | null }`, `CustomerInput` (id/userId/deletedAt olmadan), `Appointment { id; userId; customerId; date; startTime; endTime; status; note; customer: { id; firstName; lastName } }`, `AppointmentInput { customerId; date; startTime; endTime; status?; note? }`. Alan adları `api-contract/openapi.yaml` ile birebir.
- Produces: `client.ts`: `class ApiError extends Error { status: number; code: string }`; `request<T>(path: string, options?: { method?: string; body?: unknown; skipUnauthorizedHandler?: boolean }): Promise<T>` — `path` `/api/v1`'e göre göreli; 204 → `undefined`; hata gövdesindeki `error.code/message` ile `ApiError` fırlatır; `fetch` reddedilirse `ApiError(0, 'network_error', 'Sunucuya ulaşılamadı.')`; 401'de `setUnauthorizedHandler` ile kaydedilen işlevi çağırır (`skipUnauthorizedHandler` yoksa); `setUnauthorizedHandler(fn: (() => void) | null): void`.
- Produces: `auth.ts`: `login(email: string, password: string): Promise<User>` (401'de işleyici çağrılmaz), `fetchMe(): Promise<User | null>` (401 → `null`), `logout(): Promise<void>`.
- Produces: `useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: ApiError | null; reload: () => void }` — yeni çağrı başladığında eski çağrının sonucu yok sayılır.
- Produces: `AuthProvider({ children })` ve `useAuth(): { status: 'loading' | 'anonymous' | 'authenticated'; user: User | null; login(email: string, password: string): Promise<void>; logout(): Promise<void> }`; açılışta `fetchMe()`; 401 işleyicisini `anonymous` yapacak şekilde kaydeder.
- Produces: `RequireAuth()` — `loading` iken `Yükleniyor…`, `anonymous` iken `<Navigate to="/giris" replace />`, aksi halde `<Outlet />`.
- Produces: `test-utils.tsx`: `renderApp(ui: ReactElement, options?: { route?: string }): RenderResult` (`MemoryRouter` + `AuthProvider`), `stubFetch(handlers: Record<string, (request: { url: string; body: unknown }) => { status?: number; body?: unknown }>): { calls: { method: string; url: string; body: unknown }[] }` (anahtar `"GET /api/v1/auth/me"` biçiminde; eşleşmeyen çağrı testi düşürür).
- Produces: `PanelLayout()` — üstte kullanıcının `displayName`'i, `NavLink` sekmeleri (Bugün `/panel`, Hafta `/panel/hafta`, Ay `/panel/ay`, Müşteriler `/panel/musteriler`), `Çıkış` düğmesi; altında `<Outlet />`.

- [ ] **Step 1: Başarısız testler (istemci ve kanca)** — `client.test.ts`: 204 `undefined` döner; JSON yanıt çözülür; 400 gövdesi `ApiError{status:400, code:'validation_error', message}` olur; `fetch` reddedilince `Sunucuya ulaşılamadı.`; 401'de kayıtlı işleyici çağrılır, `skipUnauthorizedHandler` ile çağrılmaz. `useApi.test.tsx`: `loading → data`; hata `error`'a düşer; `reload()` yeniden çağırır; **yarış:** ilk çağrı geç, ikinci çağrı erken çözülünce ekranda ikincinin verisi kalır. `types.contract.test.ts`: `openapi.yaml`'ı `fs` ile okuyup `User`, `Customer`, `Appointment` (ve `customer` iç nesnesi) şemalarının özellik adlarını girinti ile ayıklar ve `types.ts`'deki örnek nesnelerin anahtarlarıyla karşılaştırır. `npm test` → FAIL.
- [ ] **Step 2: `types.ts`, `client.ts`, `auth.ts`, `useApi.ts`'i yaz; PASS.**
- [ ] **Step 3: Başarısız testler (oturum ve sayfalar)** — `auth.test.tsx`: `/me` 200 ise `RequireAuth` altındaki içerik görünür; `/me` 401 ise `/giris`'e yönlenir (**derin bağlantı:** başlangıç rotası `/panel/hafta`); çalışırken gelen 401 kullanıcıyı `/giris`'e atar. `Login.test.tsx`: yanlış parolada backend mesajı (`E-posta veya parola hatalı.`) form altında görünür ve e-posta alanı korunur; başarıda `/panel`'e gider; istek sürerken düğme kapalı. `PanelLayout.test.tsx`: `displayName` ve dört sekme görünür; `Çıkış` `POST /api/v1/auth/logout` çağırır ve `/giris`'e yönlendirir.
- [ ] **Step 4: `AuthProvider`, `RequireAuth`, `Login`, `PanelLayout`, `test-utils`'i yaz; `App.tsx` rotalarını bağla; `Landing`'deki "Giriş" bağlantısı çalışır. `npm test` ve `npm run build` PASS.**
- [ ] **Step 5: Tarayıcı doğrulaması** — Backend + `frontend` derlenmiş, `http://localhost:3000/giris`: demo hesapla giriş (`ayse@ritma.demo`, parola CLAUDE.md'de), `/panel`'e geçiş, sayfa yenileyince oturumun sürmesi, `Çıkış` sonrası `/panel`'in `/giris`'e dönmesi. Sunucu ve sekme kapatılır.
- [ ] **Step 6: Commit** — `git add frontend && git commit -m "feat: API istemcisi, oturum ve giriş"` (izin alındıktan sonra).

---

### Task 4: Müşteriler ekranı

**Dal:** `feat/frontend-customers`

**Files:**
- Create: `frontend/src/api/customers.ts`, `frontend/src/lib/labels.ts`, `labels.test.ts`, `frontend/src/lib/useDebouncedValue.ts`
- Create: `frontend/src/components/Modal.tsx`, `Modal.css`, `ConfirmDialog.tsx`, `Modal.test.tsx`
- Create: `frontend/src/pages/panel/customers/CustomersPage.tsx`, `CustomersPage.css`, `CustomerForm.tsx`, `CustomerForm.css`, `CustomersPage.test.tsx`
- Modify: `frontend/src/App.tsx` (`/panel/musteriler` yer tutucusu yerine `CustomersPage`)

**Interfaces:**
- Consumes: `request`, `useApi`, `Customer`, `CustomerInput`, `Gender`, `stubFetch`, `renderApp` (Görev 3).
- Produces: `customers.ts`: `listCustomers(search?: string): Promise<Customer[]>` (`GET /customers?search=`; boş arama parametresiz), `createCustomer(input: CustomerInput): Promise<Customer>`, `updateCustomer(id: string, patch: Partial<CustomerInput>): Promise<Customer>`, `deleteCustomer(id: string): Promise<void>`. Yanıtlar `{ customers }` / `{ customer }` zarfından açılır.
- Produces: `labels.ts`: `genderLabel(gender: Gender): string`, `statusLabel(status: AppointmentStatus): string`, `GENDERS: Gender[]`, `STATUSES: AppointmentStatus[]` (etiketler Global Constraints'teki gibi).
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T`.
- Produces: `Modal({ title: string; onClose: () => void; children })` — `role="dialog"`, `aria-modal`, `Escape` ile kapanır; `ConfirmDialog({ message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void })`.
- Produces: `CustomerForm({ customer?: Customer; onSaved: () => void; onCancel: () => void })` — alanlar: ad, soyad, doğum tarihi (`type="date"`), cinsiyet (seçim kutusu, etiketlerle).

- [ ] **Step 1: Başarısız testler** — `labels.test.ts`: dört cinsiyet ve üç durum için etiketler. `CustomersPage.test.tsx`: liste ad-soyad ve cinsiyet etiketiyle gelir; boşken `Henüz müşteri yok.`; hata durumunda `Yeniden dene` ikinci isteği yapar; arama kutusu 300 ms sonra `?search=` ile istek atar (sahte zamanlayıcı); **yarış:** geç gelen eski arama yanıtı yeni sonucu ezmez; `CustomerForm` 400 yanıtında backend mesajı (örn. `Soyad boş olamaz.`) formda görünür, pencere açık kalır, girilen değerler korunur; **çift gönderim:** düğmeye iki kez basınca tek `POST` gider ve istek sürerken düğme kapalıdır; başarıda pencere kapanır ve liste yenilenir; silme `ConfirmDialog`'dan geçer ve `DELETE` çağırır. `Modal.test.tsx`: `Escape` `onClose` çağırır. `npm test` → FAIL.
- [ ] **Step 2: Yukarıdaki dosyaları yaz** — telefon genişliğinde liste tek sütuna iner (`CustomersPage.css` içinde `@media`). `npm test` ve `npm run build` PASS.
- [ ] **Step 3: Tarayıcı doğrulaması** — giriş yap, müşteri ekle (geçersiz: gelecek doğum tarihi → mesaj; geçerli → listede), ara (`MÜŞT` büyük harf), düzenle, sil. Dar pencerede (360px iframe ya da `resize_window`) düzen kontrol edilir. Sunucu ve sekme kapatılır.
- [ ] **Step 4: Commit** — `git add frontend && git commit -m "feat: müşteriler ekranı"` (izin alındıktan sonra).

---

### Task 5: Günlük görünüm ve randevu formu

**Dal:** `feat/frontend-daily`

**Files:**
- Create: `frontend/src/lib/date.ts`, `date.test.ts`
- Create: `frontend/src/api/appointments.ts`
- Create: `frontend/src/pages/panel/daily/DailyPage.tsx`, `DailyPage.css`, `AppointmentForm.tsx`, `AppointmentForm.css`, `DailyPage.test.tsx`
- Modify: `frontend/src/App.tsx` (`/panel` index → `DailyPage`)

**Interfaces:**
- Consumes: `Modal`, `ConfirmDialog`, `useApi`, `statusLabel`, `STATUSES`, `listCustomers`, `Appointment`, `AppointmentInput`, `Customer` (Görev 3–4).
- Produces: `date.ts`: `toDateString(date: Date): string` (yerel yıl/ay/gün), `parseDateString(value: string): Date` (yerel gece yarısı), `todayString(now?: Date): string`, `addDays(value: string, days: number): string`, `formatDayLong(value: string): string` (`tr-TR`, örn. `3 Kasım 2026 Salı`).
- Produces: `appointments.ts`: `listAppointments(from: string, to: string): Promise<Appointment[]>`, `createAppointment(input: AppointmentInput): Promise<Appointment>`, `updateAppointment(id: string, patch: Partial<AppointmentInput>): Promise<Appointment>`, `deleteAppointment(id: string): Promise<void>`.
- Produces: `DailyPage()` — gün `?tarih=YYYY-MM-DD` sorgu parametresinden okunur (yoksa bugün); önceki/sonraki/bugün düğmeleri parametreyi günceller. Hafta ve ay görünümleri (Görev 6) günlük görünüme bu parametreyle bağlanır.
- Produces: `AppointmentForm({ appointment?: Appointment; defaultDate: string; onSaved: () => void; onCancel: () => void })` — müşteri seçimi, tarih, başlangıç/bitiş (`type="time"`), durum, not.

- [ ] **Step 1: Başarısız testler (`date.test.ts`)** — `toDateString(new Date(2026, 10, 3, 0, 30))` → `'2026-11-03'` (gece yarısına yakın, **gün kayması yok**); `addDays('2026-12-31', 1)` → `'2027-01-01'`; `addDays('2026-03-01', -1)` → `'2026-02-28'`; `parseDateString('2026-11-03').getDate()` → 3; `todayString(new Date(2026, 0, 1))` → `'2026-01-01'`. `npm test` → FAIL; `date.ts`'i yaz → PASS.
- [ ] **Step 2: Başarısız testler (`DailyPage.test.tsx`)** — `?tarih=2026-11-03` için `GET /appointments?from=2026-11-03&to=2026-11-03`; satırlar `10:00–11:00`, `Ayşe Kaya`, `Planlandı`, not metniyle görünür; `Sonraki gün` bir sonraki günün isteğini atar; boş durumda `Bu gün için randevu yok.`; hata durumunda `Yeniden dene`; **silinmiş müşteri:** `appointment.customer` adı satırda aynen görünür; formu düzenleme modunda açınca müşteri seçim kutusu, aktif listede olmayan mevcut müşteriyi `Ad Soyad (silinmiş)` ile ayrıca listeler; 409 yanıtında backend mesajı formda görünür, pencere açık kalır, değerler korunur; **çift gönderim:** iki tıklamada tek `POST`, istek sürerken düğme kapalı; `İptal et` onaydan sonra `PATCH` ile `{ status: 'cancelled' }` gönderir; `Sil` onaydan sonra `DELETE` çağırır. `npm test` → FAIL.
- [ ] **Step 3: `appointments.ts`, `DailyPage`, `AppointmentForm`'u yaz** — satırlar API'nin döndürdüğü sırayla gösterilir (backend tarih ve başlangıç saatine göre sıralar). `npm test` ve `npm run build` PASS.
- [ ] **Step 4: Tarayıcı doğrulaması** — randevu ekle, aynı saate ikincisini ekleyip 409 uyarısını gör (pencere açık, veri duruyor), saati düzelt, kaydet; iptal et (saat boşalır, aynı saate yenisi eklenebilir); sil; gün gezgini; müşteri silinince randevu satırında adın durması. Sunucu ve sekme kapatılır.
- [ ] **Step 5: Commit** — `git add frontend && git commit -m "feat: günlük görünüm ve randevu formu"` (izin alındıktan sonra).

---

### Task 6: Haftalık ve aylık görünümler

**Dal:** `feat/frontend-calendar`

**Files:**
- Modify: `frontend/src/lib/date.ts`, `date.test.ts` (yeni yardımcılar)
- Create: `frontend/src/pages/panel/weekly/WeeklyPage.tsx`, `WeeklyPage.css`, `WeeklyPage.test.tsx`
- Create: `frontend/src/pages/panel/monthly/MonthlyPage.tsx`, `MonthlyPage.css`, `MonthlyPage.test.tsx`
- Modify: `frontend/src/App.tsx` (`hafta` ve `ay` yer tutucuları yerine sayfalar), `CLAUDE.md` (son hâl: panel rotaları, `?tarih=` parametresi)

**Interfaces:**
- Consumes: `listAppointments`, `useApi`, `addDays`, `parseDateString`, `toDateString`, `todayString`, `statusLabel` (Görev 3–5).
- Produces: `startOfWeek(value: string): string` (Pazartesi), `weekDays(value: string): string[]` (Pazartesi–Pazar, 7 tarih), `monthGrid(year: number, month: number): (string | null)[][]` (`month` 1–12; satırlar Pazartesi'den başlayan haftalar, ay dışı hücreler `null`), `monthRange(year: number, month: number): { from: string; to: string }`, `formatMonth(year: number, month: number): string` (örn. `Kasım 2026`).
- Produces: `WeeklyPage()` ve `MonthlyPage()` — gezgin düğmeleri (önceki/sonraki/bugün); hafta/ay sorgu parametresi `?tarih=` ile belirlenir; bir güne tıklamak `/panel?tarih=YYYY-MM-DD`'ye gider.

- [ ] **Step 1: Başarısız testler (`date.test.ts`)** — `startOfWeek('2026-11-01')` (Pazar) → `'2026-10-26'`; `startOfWeek('2026-11-02')` (Pazartesi) → kendisi; `weekDays('2026-11-04')` 7 eleman, ilki `'2026-11-02'`, sonuncusu `'2026-11-08'`; **ay ızgarası kenar durumları:** `monthGrid(2026, 11)` (1 Kasım Pazar → ilk satırda 6 `null`, 5 satır); `monthGrid(2027, 2)` (1 Şubat Pazartesi, 28 gün → tam 4 satır, hiç `null` yok); `monthGrid(2028, 2)` (artık yıl, 29 gün içerir); 31 günlük bir ayda son satırdaki hücre sayısı 7; her satır tam 7 eleman. `monthRange(2026, 11)` → `{ from: '2026-11-01', to: '2026-11-30' }`. `npm test` → FAIL; yardımcıları yaz → PASS.
- [ ] **Step 2: Başarısız testler (sayfalar)** — `WeeklyPage`: `GET /appointments?from=<Pazartesi>&to=<Pazar>`; her gün sütununda o günün randevuları saat ve müşteri adıyla; güne tıklayınca `/panel?tarih=...`; boş, yükleniyor, hata durumları. `MonthlyPage`: `GET` ay aralığıyla; günlerde randevu sayısı (iptal edilenler sayılmaz); güne tıklayınca günlük görünüme geçer; önceki/sonraki ay. `npm test` → FAIL.
- [ ] **Step 3: Sayfaları ve CSS'i yaz** — telefon genişliğinde haftalık görünüm tek sütun (gün gün alt alta), aylık ızgara yatay kaydırmasız sığar. `npm test` ve `npm run build` PASS.
- [ ] **Step 4: Uçtan uca tarayıcı doğrulaması (tüm akış)** — `frontend` derlenir, backend başlatılır. Giriş → müşteri ekle → randevu ekle (çakışma uyarısı dahil) → Hafta'da randevuyu gör → güne tıkla, günlük görünüme geç → Ay'da sayıyı gör → müşteriyi sil, randevuda adın durduğunu gör → `/panel/hafta`'yı yenile, oturumun sürdüğünü gör → çıkış. Telefon genişliğinde (360px) üç görünümü kontrol et. Sunucu ve sekme kapatılır.
- [ ] **Step 5: Son kontroller** — `cd frontend && npm test && npm run build`, `cd backend && npm test && npm run build` hepsi PASS. `CLAUDE.md` panel rotaları ve `?tarih=` notuyla güncel.
- [ ] **Step 6: Commit** — `git add frontend CLAUDE.md && git commit -m "feat: haftalık ve aylık görünümler"` (izin alındıktan sonra).

# Ritma Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hizmet sağlayıcıların giriş yapıp müşterilerini ve randevularını yönettiği, verileri bellekte tutan bir Node.js + Express + TypeScript API kurmak.

**Architecture:** Uç noktalar (HTTP) → servisler (iş kuralları) → depolar (arayüz + bellek gerçeklemesi). Giriş bir `IdentityProvider` arayüzünün arkasındadır; ilk gerçekleme demo hesaplardır. Oturum jetonu hem çerezle hem `Authorization: Bearer` ile kabul edilir. Aynı sunucu `web/` klasörünü statik servis eder.

**Tech Stack:** Node.js 24, TypeScript, Express. Test: Node'un yerleşik `node:test` + `node:assert`, çalıştırıcı `tsx`. Parola özeti için `node:crypto` (`scrypt`). Çerez ayrıştırma elle (ek kütüphane yok). Bağımlılıklar yalnızca `express`, `typescript`, `tsx`, `@types/express`, `@types/node`.

**Spec:** `docs/superpowers/specs/2026-10-27-ritma-backend-design.md`

## Global Constraints

- Klasör ve dosya adları İngilizce ve küçük harf: `backend/`, `web/`, `api-contract/`, `docs/`.
- API ön eki `/api/v1`, JSON. Hata biçimi: `{ "error": { "code": string, "message": string } }`; `message` Türkçe. Kodlar ve durumlar: `validation_error` 400, `unauthorized` 401, `not_found` 404, `conflict` 409.
- İç kodlar İngilizce ve ASCII (plan kararı, mobil istemciler için): durum `scheduled | completed | cancelled` (arayüzde planlandı / tamamlandı / iptal); cinsiyet `female | male | other | undisclosed` (kadın / erkek / diğer / belirtmek istemiyorum).
- Tarih `YYYY-MM-DD`, saat `HH:mm` (24 saat, tek yerel saat, saat dilimi yok). Bitiş saati başlangıçtan büyük olmalı; gece yarısını geçen randevu yok. Geçmiş tarihe randevu eklenebilir.
- Her müşteri ve randevu tek kullanıcıya aittir. Başka kullanıcının kaydı (müşteri, randevu, randevudaki müşteri id'si) her zaman `404` döner.
- Çakışma: aynı kullanıcı, aynı tarih, `cancelled` olmayan iki randevunun aralıkları kesişiyorsa `409`. Biri `10:00`'da biterken diğeri `10:00`'da başlıyorsa çakışma değildir. `completed` çakışmaya girer. Düzenlemede randevunun kendisi hariç tutulur. `cancelled → scheduled` geri dönüşü çakışma kontrolünü yeniden çalıştırır.
- Müşteri soft delete: `deletedAt` yazılır; listede/aramada görünmez, yeni randevu verilemez (`404`), mevcut randevular erişilebilir kalır ve müşteri adı randevu yanıtında görünmeye devam eder. Geri getirme yok.
- Doğum tarihi zorunlu, gelecekte olamaz. Not alanı isteğe bağlı, varsayılan boş metin.
- Arama: ad ve soyadda büyük/küçük harf ve Türkçe karakter ayrımı yok (`İ ı I i`, `ç ş ğ ö ü` katlanır), "içerir" eşleşmesi. Tarih aralığı en fazla 366 gün, sayfalama yok.
- Çerez: `HttpOnly`, `SameSite=Lax`, yayında (`NODE_ENV=production`) `Secure`. Oturumlar bellekte.
- Demo hesaplar: iki kullanıcı, parolalar kodda sabit ama yalnızca `scrypt` özetiyle saklanır; `DEMO_ACCOUNTS_ENABLED` ortam değişkeniyle kapatılır, yayında varsayılan kapalı.
- Çakışma kontrolü ve ekleme depoda tek çağrıdır (`saveIfNoConflict`).
- Örnek veri yok; demo kullanıcıların verisi boş başlar.
- Commit atma ve push yapma kullanıcının açık onayına bağlıdır. Plan adımlarındaki commit adımlarını yürütücü, kullanıcıdan commit izni alındıktan sonra uygular.

## Review Focus

Spec'in ima ettiği ama görevlerin ana testlerinin dışında kalabilecek durumlar; her biri ilgili görevde bir testle sabitlenir.

1. Başka kullanıcının müşteri id'sini randevuya vermek: `404`, kayıt oluşmaz (Görev 6).
2. Çakışma sınırı: tam bitişik randevu serbest, bir dakika kesişen engelli; iptal edilmiş randevunun saatine yeni randevu verilebilir; iptal edilen sonra `scheduled` yapılırsa ve saat doluysa `409` (Görev 6).
3. Silinmiş müşterinin eski randevusu takvimde müşteri adıyla dönmeye devam eder, ama o müşteriye yeni randevu verilemez (Görev 6).
4. Geçersiz giriş: `25:00`, `2026-02-30`, bitiş ≤ başlangıç, aralık > 366 gün, bozuk JSON gövde, bilinmeyen `gender` → hepsi `400` (Görev 3, 8).
5. Oturumsuz ya da bozuk jetonla her korumalı uç nokta `401`; çıkıştan sonra eski jeton `401` (Görev 7, 8).

---

### Task 1: `index.html`'i `web/` altına taşı

**Files:**
- Move: `index.html` → `web/index.html`
- Modify: `CLAUDE.md` (dosya yolları ve "Teknoloji" ile "Kurallar" bölümlerindeki "sadece HTML, CSS, JS" ifadesi)

**Interfaces:**
- Produces: `web/index.html` yolu; sonraki görevler (Görev 10) `web/` klasörünü statik servis eder.

- [ ] **Step 1: Dosyayı `git mv index.html web/index.html` ile taşı.** Dosya içeriği değişmez.
- [ ] **Step 2: `CLAUDE.md`'yi güncelle.** "Mevcut sayfa tek dosyadır (`index.html`)" ve komut örneklerindeki `index.html` yollarını `web/index.html` yap. "Teknoloji"ye şunu ekle: backend Node.js + Express + TypeScript'tir (`backend/`), web ön yüzü hâlâ düz HTML/CSS/JS'dir. "Kurallar"daki "Sadece HTML, CSS ve JS yaz" satırını "Ön yüz (`web/`) sadece HTML, CSS ve JS; backend (`backend/`) TypeScript" olarak değiştir.
- [ ] **Step 3: Doğrula.** `git status` yalnızca taşıma ve `CLAUDE.md` değişikliğini göstermeli; `web/index.html` tarayıcıda açılıp sayfa eskisi gibi görünmeli (başsız Chrome ekran görüntüsü CLAUDE.md'deki komutla, yeni yolla).
- [ ] **Step 4: Commit.** `git add web/index.html CLAUDE.md && git commit -m "chore: index.html dosyasını web/ altına taşı"`

---

### Task 2: Backend iskeleti ve sağlık uç noktası

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/.gitignore` (`node_modules`, `dist`)
- Create: `backend/src/app.ts`, `backend/src/app.test.ts`

**Interfaces:**
- Produces: `createApp(deps: AppDeps): express.Express` (`AppDeps` bu görevde `{}` boş arayüz; sonraki görevler alan ekler). `GET /api/v1/health` → `200 { "status": "ok" }`.

- [ ] **Step 1: `backend/package.json` oluştur.** `"type": "module"`; betikler: `test` = `node --import tsx --test "src/**/*.test.ts"`, `dev` = `node --import tsx --watch src/server.ts`, `build` = `tsc`, `start` = `node dist/server.js`. Bağımlılıkları `npm install express` ve `npm install -D typescript tsx @types/express @types/node` ile ekle. `tsconfig.json`: `strict: true`, `module`/`moduleResolution` = `NodeNext`, `outDir` = `dist`, `rootDir` = `src`.
- [ ] **Step 2: Başarısız testi yaz.** `app.test.ts`: `createApp({})` ile uygulamayı `listen(0)` ile ayağa kaldır, `fetch('/api/v1/health')` → durum `200`, gövde `{ status: 'ok' }`. Test adı: `health endpoint returns ok`.
- [ ] **Step 3: Çalıştır, hata aldığını gör.** `cd backend && npm test` → `createApp` bulunamadı gibi bir hata.
- [ ] **Step 4: `createApp`'i `app.ts` içinde yaz.** JSON gövde ayrıştırıcıyı (`express.json()`) ve sağlık rotasını ekle.
- [ ] **Step 5: Testi çalıştır, geçtiğini gör.** `npm test` → PASS. `npm run build` hatasız derlenmeli.
- [ ] **Step 6: Commit.** `git add backend && git commit -m "feat: backend iskeleti ve sağlık uç noktası"`

---

### Task 3: Alan tipleri, hatalar ve girdi doğrulayıcıları

**Files:**
- Create: `backend/src/domain/types.ts`, `backend/src/domain/errors.ts`, `backend/src/domain/validation.ts`, `backend/src/domain/search.ts`
- Test: `backend/src/domain/validation.test.ts`, `backend/src/domain/search.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type Gender = 'female' | 'male' | 'other' | 'undisclosed'`
  - `type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'`
  - `interface User { id: string; email: string; displayName: string }`
  - `interface Customer { id: string; userId: string; firstName: string; lastName: string; birthDate: string; gender: Gender; deletedAt: string | null }`
  - `interface Appointment { id: string; userId: string; customerId: string; date: string; startTime: string; endTime: string; status: AppointmentStatus; note: string }`
  - `interface CustomerInput { firstName: string; lastName: string; birthDate: string; gender: Gender }`
  - `interface AppointmentInput { customerId: string; date: string; startTime: string; endTime: string; status: AppointmentStatus; note: string }`
- Produces (`errors.ts`): `class AppError extends Error { status: 400|401|404|409; code: 'validation_error'|'unauthorized'|'not_found'|'conflict' }` ve yardımcılar `validationError(msg)`, `unauthorized(msg)`, `notFound(msg)`, `conflict(msg)`.
- Produces (`validation.ts`; hepsi geçersizse `validationError` fırlatır):
  - `parseCustomerInput(body: unknown, today: string): CustomerInput` — ad/soyad boş olamaz (kırpılır), `birthDate` geçerli takvim günü ve `today`'den büyük olamaz, `gender` listede.
  - `parseCustomerPatch(body: unknown, today: string): Partial<CustomerInput>` — verilen alanlar aynı kurallarla doğrulanır, en az bir alan zorunlu.
  - `parseAppointmentInput(body: unknown): AppointmentInput` — `status` verilmezse `scheduled`, `note` verilmezse `''`; saat biçimi `HH:mm` (00:00–23:59), `endTime > startTime`, tarih geçerli takvim günü.
  - `parseAppointmentPatch(body: unknown): Partial<AppointmentInput>` — verilen alanlar doğrulanır; saat çifti kontrolü servis katmanında birleştirilmiş değerle yapılır.
  - `parseDateRange(from: unknown, to: unknown): { from: string; to: string }` — ikisi de zorunlu geçerli tarih, `to >= from`, en fazla 366 gün (`to - from <= 365` gün).
  - `isValidDate(s: string): boolean`, `isValidTime(s: string): boolean`.
- Produces (`search.ts`): `foldForSearch(s: string): string` — küçük harfe çevirir ve `ı İ I i → i`, `ç → c`, `ş → s`, `ğ → g`, `ö → o`, `ü → u` katlar.

- [ ] **Step 1: Başarısız testleri yaz.** `validation.test.ts` içinde: `isValidDate('2026-02-30')` yanlış, `'2026-02-28'` doğru; `isValidTime('25:00')` yanlış, `'23:59'` doğru; `parseAppointmentInput` bitiş ≤ başlangıç için `AppError` (`status === 400`) fırlatır ve varsayılan `status: 'scheduled'`, `note: ''` döndürür; `parseCustomerInput` gelecek doğum tarihini, bilinmeyen `gender`'ı, boş adı reddeder; `parseDateRange('2026-01-01','2027-01-02')` reddeder (367 gün), `('2026-01-01','2027-01-01')` kabul eder; gövde `null` ya da dizi ise `400`. `search.test.ts`: `foldForSearch('ILGAZ') === foldForSearch('ılgaz') === foldForSearch('İlgaz')`; `foldForSearch('Şener') === 'sener'`.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.** `npm test`.
- [ ] **Step 3: Dosyaları yaz.** Tarih geçerliliği için `Date.UTC` ile gidiş-dönüş karşılaştırması kullan (JS `Date` 30 Şubat'ı kaydırır). Dosyalar yalnızca bu bölümdeki imzaları dışa açar.
- [ ] **Step 4: Çalıştır, geçtiğini gör.** `npm test` → PASS.
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: alan tipleri, hata sınıfları ve girdi doğrulama"`

---

### Task 4: Depo arayüzleri ve bellek gerçeklemeleri

**Files:**
- Create: `backend/src/repositories/types.ts`, `backend/src/repositories/memory/customer-repository.ts`, `backend/src/repositories/memory/appointment-repository.ts`, `backend/src/repositories/memory/session-store.ts`
- Test: `backend/src/repositories/memory/customer-repository.test.ts`, `backend/src/repositories/memory/appointment-repository.test.ts`, `backend/src/repositories/memory/session-store.test.ts`

**Interfaces:**
- Consumes: Görev 3 tipleri.
- Produces (`repositories/types.ts`; tüm metotlar eşzamansız `Promise` döner ki veri tabanı gerçeklemesi aynı imzayla yazılabilsin):
  - `interface CustomerRepository { create(c: Customer): Promise<Customer>; findById(userId: string, id: string): Promise<Customer | undefined>; listActive(userId: string): Promise<Customer[]>; update(c: Customer): Promise<Customer> }` — `findById` silinmiş kayıtları da döndürür (randevu adı için), `listActive` yalnızca `deletedAt === null` olanları.
  - `interface AppointmentRepository { findById(userId: string, id: string): Promise<Appointment | undefined>; listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]>; saveIfNoConflict(a: Appointment): Promise<Appointment | undefined>; delete(userId: string, id: string): Promise<boolean> }` — `saveIfNoConflict` ekleme ya da güncelleme yapar (id'ye göre), `status !== 'cancelled'` ise aynı kullanıcı + tarihte kendisi hariç kesişen aktif randevu varsa `undefined` döner ve hiçbir şey yazmaz; `cancelled` ise çakışma bakmadan kaydeder. `listByDateRange` iki ucu dahil, `date` sonra `startTime` sırasıyla.
  - `interface Session { token: string; userId: string; createdAt: string }`, `interface SessionStore { create(userId: string): Promise<Session>; find(token: string): Promise<Session | undefined>; delete(token: string): Promise<void> }`
  - Üç sınıf: `MemoryCustomerRepository`, `MemoryAppointmentRepository`, `MemorySessionStore` (argümansız yapıcı). Kimlikler `crypto.randomUUID()`, jetonlar `crypto.randomBytes(32).toString('hex')`; kimliği servis üretir (depo dışarıdan gelen `id`'yi kullanır), yalnızca `MemorySessionStore.create` jetonu kendisi üretir.

- [ ] **Step 1: Başarısız testleri yaz.**
  - Müşteri: başka `userId`'nin kaydı `findById`'da `undefined`; `listActive` silinmişi saklar; `update` ile `deletedAt` yazılınca `findById` hâlâ bulur.
  - Randevu: `saveIfNoConflict` ile `10:00–11:00` kaydedilir; `10:30–11:30` `undefined` döner; `11:00–12:00` kaydedilir (bitişik); `cancelled` olan `10:30–11:30` çakışma saymadan kaydedilir; var olan randevuyu aynı aralıkla güncellemek çakışma değildir; başka kullanıcıdaki aynı saat çakışma değildir; `listByDateRange` iki ucu dahil ve sıralı.
  - Oturum: `create` sonrası `find` bulur, `delete` sonrası `find` `undefined`.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Arayüzleri ve üç gerçeklemeyi yaz.** Depolar `Map` tutar; `saveIfNoConflict` kontrol ve yazmayı tek eşzamansız çağrıda yapar (arada `await` yok), böylece bellekte atomiktir. Aralık kesişimi: `a.startTime < b.endTime && b.startTime < a.endTime`.
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: depo arayüzleri ve bellek gerçeklemeleri"`

---

### Task 5: Müşteri servisi

**Files:**
- Create: `backend/src/services/customer-service.ts`
- Test: `backend/src/services/customer-service.test.ts`

**Interfaces:**
- Consumes: `CustomerRepository` (Görev 4), `CustomerInput`, `foldForSearch`, `notFound` (Görev 3).
- Produces: `class CustomerService { constructor(customers: CustomerRepository, clock: () => Date = () => new Date()); create(userId: string, input: CustomerInput): Promise<Customer>; get(userId: string, id: string): Promise<Customer>; search(userId: string, query?: string): Promise<Customer[]>; update(userId: string, id: string, patch: Partial<CustomerInput>): Promise<Customer>; softDelete(userId: string, id: string): Promise<void> }`
- `get/update/softDelete`: kayıt yok ya da başka kullanıcınınsa `notFound`; silinmiş müşteri için `get` ve `update` de `notFound` (silineni görme/düzenleme yok), `softDelete` silinmiş müşteri için `notFound`.
- `search`: `query` boş/yok ise tüm aktifler; doluysa `foldForSearch(firstName + ' ' + lastName)` içinde `foldForSearch(query)` geçenler; `lastName` sonra `firstName` sıralı.

- [ ] **Step 1: Başarısız testleri yaz.** Sahiplik (başka kullanıcı `404`), soft delete sonrası `search`'te yok ve `get`'te `404`, arama `"ılgaz"` / `"ILGAZ"` / `"ilgaz"` ile `Ilgaz Demir`'i bulur, `"sener"` ile `Şener`'i bulur, `"gaz d"` (ad-soyad arası) eşleşir, boş sorgu hepsini döner. `update` yalnızca verilen alanları değiştirir.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Servisi yaz.** Kimlik `crypto.randomUUID()`; `deletedAt` ISO metin (`clock().toISOString()`).
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: müşteri servisi (sahiplik, arama, soft delete)"`

---

### Task 6: Randevu servisi

**Files:**
- Create: `backend/src/services/appointment-service.ts`
- Test: `backend/src/services/appointment-service.test.ts`

**Interfaces:**
- Consumes: `AppointmentRepository`, `CustomerRepository` (Görev 4), `AppointmentInput`, hata yardımcıları (Görev 3).
- Produces:
  - `interface AppointmentView extends Appointment { customer: { id: string; firstName: string; lastName: string } }`
  - `class AppointmentService { constructor(appointments: AppointmentRepository, customers: CustomerRepository); list(userId: string, from: string, to: string): Promise<AppointmentView[]>; get(userId: string, id: string): Promise<AppointmentView>; create(userId: string, input: AppointmentInput): Promise<AppointmentView>; update(userId: string, id: string, patch: Partial<AppointmentInput>): Promise<AppointmentView>; remove(userId: string, id: string): Promise<void> }`
- Kurallar: `create` → müşteri bulunamaz/başkasınınsa/silinmişse `notFound`; çakışmada `conflict('Bu saat aralığında başka bir randevunuz var.')`. `update` → mevcut kayıt ile `patch` birleştirilir, birleşik değerle `endTime > startTime` kontrolü (`validationError`), `customerId` değişiyorsa aynı müşteri kuralları, sonra `saveIfNoConflict`; `cancelled → scheduled` da bu yoldan çakışma kontrolüne girer. `list/get` müşteri bilgisini (silinmiş olsa bile) `customer` alanına koyar. `remove` olmayan/başkasının kaydı için `notFound`.

- [ ] **Step 1: Başarısız testleri yaz** (bellek depolarıyla, mock yok):
  - Review Focus 1: başka kullanıcının müşteri id'siyle `create` → `404`, `list` boş.
  - Review Focus 2: `10:00–11:00` varken `10:59–12:00` → `409`; `11:00–12:00` → başarılı; `10:00–11:00` iptal edilince aynı saate yeni randevu başarılı; iptali tekrar `scheduled` yapmak dolu saatte `409`, boş saatte başarılı; `completed` randevu da çakışır; randevuyu kendi aralığına güncellemek `409` vermez.
  - Review Focus 3: müşteri silindikten sonra eski randevu `list`'te `customer.firstName` ile döner; o müşteriye yeni `create` → `404`.
  - `update` ile yalnızca `startTime`'ı `endTime`'dan sonraya çekmek → `400`.
  - Başka kullanıcının randevusunu `get/update/remove` → `404`.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Servisi yaz.** Kimlik `crypto.randomUUID()`.
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: randevu servisi (çakışma, sahiplik, durum geçişleri)"`

---

### Task 7: Kimlik sağlayıcı, demo hesaplar ve oturum servisi

**Files:**
- Create: `backend/src/auth/identity-provider.ts`, `backend/src/auth/demo-identity-provider.ts`, `backend/src/auth/session-service.ts`, `backend/src/config.ts`
- Test: `backend/src/auth/demo-identity-provider.test.ts`, `backend/src/auth/session-service.test.ts`, `backend/src/config.test.ts`

**Interfaces:**
- Consumes: `User` (Görev 3), `SessionStore` (Görev 4).
- Produces:
  - `interface Credentials { email: string; password: string }`; `interface IdentityProvider { authenticate(credentials: Credentials): Promise<User | undefined>; findUser(id: string): Promise<User | undefined> }` — Google gelince yeni bir gerçekleme eklenir, oturum ve rotalar değişmez.
  - `class DemoIdentityProvider implements IdentityProvider` — iki sabit kullanıcı: `ayse@ritma.demo` (`Ayşe Demir`) ve `mehmet@ritma.demo` (`Mehmet Kaya`), parolalar sırasıyla `demo-ayse-123` ve `demo-mehmet-123`. Parolalar düz metin olarak değil, modül yüklenirken `scrypt` ile üretilen özet olarak tutulur; karşılaştırma `timingSafeEqual` ile. Kullanıcı kimlikleri sabit (`demo-user-ayse`, `demo-user-mehmet`).
  - `class SessionService { constructor(provider: IdentityProvider, store: SessionStore); login(credentials: Credentials): Promise<{ token: string; user: User }>; authenticateToken(token: string | undefined): Promise<User>; logout(token: string): Promise<void> }` — hatalı giriş ve geçersiz/boş jeton `unauthorized` (aynı mesaj, e-posta var/yok sızdırmaz).
  - `loadConfig(env: NodeJS.ProcessEnv): { port: number; production: boolean; demoAccountsEnabled: boolean }` — `PORT` varsayılan 3000; `production = env.NODE_ENV === 'production'`; `demoAccountsEnabled`: `DEMO_ACCOUNTS_ENABLED` `'true'`/`'false'` ise ona göre, yoksa `!production`.

- [ ] **Step 1: Başarısız testleri yaz.** Doğru e-posta+parola kullanıcıyı döner; yanlış parola ve bilinmeyen e-posta `undefined`; `login` sonrası `authenticateToken(token)` kullanıcıyı verir; `logout` sonrası aynı jeton `401`; `undefined` ve rastgele jeton `401`. `loadConfig({})` → `demoAccountsEnabled: true`; `loadConfig({NODE_ENV:'production'})` → `false`; `loadConfig({NODE_ENV:'production', DEMO_ACCOUNTS_ENABLED:'true'})` → `true`. Düz parola metni, `DemoIdentityProvider` nesnesinin alanları taranarak hiçbir yerde bulunmuyor (JSON'a çevrilince `demo-ayse-123` geçmez).
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Dosyaları yaz.**
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: kimlik sağlayıcı arayüzü, demo hesaplar ve oturum servisi"`

---

### Task 8: HTTP temeli: hata işleyici, kimlik doğrulama ara katmanı ve auth rotaları

**Files:**
- Create: `backend/src/http/error-handler.ts`, `backend/src/http/auth-middleware.ts`, `backend/src/http/auth-routes.ts`, `backend/src/http/cookies.ts`
- Modify: `backend/src/app.ts` (`AppDeps` genişler; rotalar bağlanır)
- Test: `backend/src/http/auth-routes.test.ts`

**Interfaces:**
- Consumes: `SessionService` (Görev 7), `AppError` (Görev 3), `loadConfig` çıktısı.
- Produces:
  - `AppDeps` = `{ sessions: SessionService; customers: CustomerService; appointments: AppointmentService; production: boolean; staticDir?: string }`. Görev 2'deki `createApp({})` testi bu görevde ilgili alanlarla güncellenir.
  - `requireAuth(sessions: SessionService): express.RequestHandler` — jetonu önce `Authorization: Bearer <token>` başlığından, yoksa `ritma_session` çerezinden alır; kullanıcıyı `req.user` (genişletilmiş `Request` tipi `{ user?: User }`) olarak koyar; olmazsa `unauthorized`.
  - `errorHandler` — `AppError` → `{ error: { code, message } }` ve kendi `status`'ü; bozuk JSON gövde (`entity.parse.failed`) → `400 validation_error`; diğer her hata → `500` `{ error: { code: 'server_error', message: 'Beklenmeyen bir hata oluştu.' } }` (ayrıntı sızdırmaz).
  - `parseCookies(header: string | undefined): Record<string, string>`.
  - Rotalar: `POST /api/v1/auth/login` (gövde `{ email, password }`, eksik/yanlış tip `400`; başarılıda `200 { token, user }` ve `Set-Cookie: ritma_session=<token>; HttpOnly; SameSite=Lax; Path=/` (+ `Secure` yayında)), `POST /api/v1/auth/logout` (korumalı, `204`, çerezi temizler), `GET /api/v1/auth/me` (korumalı, `200 { user }`).

- [ ] **Step 1: Başarısız testleri yaz** (gerçek `listen(0)` + `fetch`, bellek depolarıyla kurulu `createApp`): doğru giriş `200`, `token` ve `set-cookie` başlığı `HttpOnly` ile; yanlış parola `401`; gövdesiz giriş `400`; bozuk JSON `400 validation_error`; Bearer ile `/auth/me` `200`; çerezle `/auth/me` `200`; jetonsuz `/auth/me` `401`; çıkıştan sonra eski jeton `401` (Review Focus 5); `GET /api/v1/olmayan` `404` JSON hata biçiminde.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Dosyaları yaz ve `createApp`'e bağla.** Hata işleyici en sona eklenir; bilinmeyen `/api` yolları için `not_found` döndüren bir son rota ekle.
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: HTTP hata işleyici, kimlik doğrulama ve auth rotaları"`

---

### Task 9: Müşteri rotaları

**Files:**
- Create: `backend/src/http/customer-routes.ts`
- Modify: `backend/src/app.ts` (rotaları bağla, hepsi `requireAuth` arkasında)
- Test: `backend/src/http/customer-routes.test.ts`

**Interfaces:**
- Consumes: `CustomerService` (Görev 5), `parseCustomerInput`, `parseCustomerPatch` (Görev 3), `requireAuth` (Görev 8).
- Produces: `GET /api/v1/customers?search=` `200 { customers: Customer[] }`; `POST /api/v1/customers` `201 { customer }`; `GET /api/v1/customers/:id` `200 { customer }`; `PATCH /api/v1/customers/:id` `200 { customer }`; `DELETE /api/v1/customers/:id` `204`. Bugünün tarihi (`YYYY-MM-DD`, yerel saat) doğrulayıcılara rota katmanında verilir.

- [ ] **Step 1: Başarısız testleri yaz:** oturumsuz her uç `401`; oluştur → ara akışı (`?search=ilgaz` ile `Ilgaz` bulunur); iki demo kullanıcıdan birinin müşterisi diğerinin listesinde yok ve `GET/PATCH/DELETE` ile `404`; gelecek doğum tarihi `400`; bilinmeyen `gender` `400`; silinen müşteri listede yok ve `GET` `404`.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Rotaları yaz.**
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: müşteri rotaları"`

---

### Task 10: Randevu rotaları

**Files:**
- Create: `backend/src/http/appointment-routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/http/appointment-routes.test.ts`

**Interfaces:**
- Consumes: `AppointmentService` (Görev 6), `parseAppointmentInput`, `parseAppointmentPatch`, `parseDateRange` (Görev 3), `requireAuth`.
- Produces: `GET /api/v1/appointments?from=&to=` `200 { appointments: AppointmentView[] }` (günlük liste `from === to`); `POST /api/v1/appointments` `201 { appointment }`; `GET /api/v1/appointments/:id` `200 { appointment }`; `PATCH /api/v1/appointments/:id` `200 { appointment }` (iptal = `{ "status": "cancelled" }`); `DELETE /api/v1/appointments/:id` `204`.

- [ ] **Step 1: Başarısız testleri yaz:** oturumsuz `401`; Görev 6'daki çakışma senaryosunun HTTP üzerinden `409` + `error.code === 'conflict'` hâli; `from=to` günlük liste; 367 günlük aralık `400`; `from` eksik `400`; `25:00` ve `2026-02-30` `400` (Review Focus 4); başka kullanıcının müşteri id'siyle oluşturma `404`; iptal PATCH'i sonrası aynı saate ikinci randevu `201`.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: Rotaları yaz.**
- [ ] **Step 4: Çalıştır, geçtiğini gör.**
- [ ] **Step 5: Commit.** `git add backend && git commit -m "feat: randevu rotaları"`

---

### Task 11: Sunucu girişi, statik servis ve uçtan uca akış

**Files:**
- Create: `backend/src/server.ts`, `backend/src/e2e.test.ts`
- Modify: `backend/src/app.ts` (`staticDir` verilmişse `express.static`)

**Interfaces:**
- Consumes: her şey (Görev 3–10).
- Produces: `buildDeps(env: NodeJS.ProcessEnv): AppDeps` — `server.ts` içinde dışa açılır; `loadConfig(env)` ile ayarları okur, bellek depolarını, `DemoIdentityProvider` (yalnızca `demoAccountsEnabled` ise; kapalıysa hiçbir kullanıcı doğrulamayan boş bir sağlayıcı), servisleri kurar. `server.ts` çalıştırıldığında `PORT` üzerinde dinler ve `staticDir` olarak repo kökündeki `web/` klasörünü verir.

- [ ] **Step 1: Başarısız e2e testi yaz.** `buildDeps({})` ile gerçek kurulum, `listen(0)`: Ayşe giriş yapar → müşteri `Ilgaz Demir` ekler → `ilgaz` ile arar → `2026-11-02` `10:00–11:00` randevu oluşturur → `10:30–11:30` ikinci randevu `409` → birinciyi iptal eder → ikincisi `201` → günlük listede iptal + yeni randevu görünür → müşteriyi siler → liste hâlâ müşteri adıyla döner → Mehmet aynı verilerin hiçbirini göremez → çıkış → eski jeton `401`. Ayrıca `buildDeps({ NODE_ENV: 'production' })` ile demo giriş `401`. Ayrıca `GET /` ile (`staticDir` ayarlıyken) `web/index.html` içeriği döner.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: `server.ts` ve `staticDir` desteğini yaz.**
- [ ] **Step 4: Tüm testleri çalıştır.** `npm test` → hepsi PASS; `npm run build` hatasız.
- [ ] **Step 5: Elle doğrula.** `npm run dev` ile sunucuyu başlat, `http://localhost:3000/` tanıtım sayfasını açmalı; `curl -s localhost:3000/api/v1/health` `{"status":"ok"}` dönmeli.
- [ ] **Step 6: Commit.** `git add backend && git commit -m "feat: sunucu girişi, statik servis ve uçtan uca test"`

---

### Task 12: API sözleşmesi ve belgeler

**Files:**
- Create: `api-contract/openapi.yaml`, `backend/src/contract.test.ts`
- Modify: `CLAUDE.md` (backend komutları ve demo hesaplar)

**Interfaces:**
- Consumes: Görev 8–10'daki tüm rota yolları.
- Produces: `api-contract/openapi.yaml` (OpenAPI 3.0) — Görev 8–10'daki her rotayı, istek/yanıt gövdelerini, hata biçimini, iç kodları (`scheduled|completed|cancelled`, `female|male|other|undisclosed`) ve `bearerAuth` güvenlik şemasını (aynı zamanda `ritma_session` çerezi) tanımlar.

- [ ] **Step 1: Başarısız testi yaz.** `contract.test.ts`: `openapi.yaml` dosyasını metin olarak oku; Görev 8–10'daki on üç rota yolu+yöntem çiftinin (üç auth, beş müşteri, beş randevu) (örnek: `/api/v1/appointments/{id}` altında `patch:`) hepsinin dosyada geçtiğini kontrol et. Ek kütüphane kullanma; basit metin araması yeterli.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.**
- [ ] **Step 3: `openapi.yaml`'ı yaz.**
- [ ] **Step 4: `CLAUDE.md`'ye "Backend" bölümü ekle:** komutlar (`cd backend && npm test`, `npm run dev`, `npm run build`), demo hesaplar ve `DEMO_ACCOUNTS_ENABLED`, hata biçimi, API sözleşmesi konumu.
- [ ] **Step 5: Çalıştır, geçtiğini gör.** `npm test` → PASS.
- [ ] **Step 6: Commit.** `git add api-contract backend CLAUDE.md && git commit -m "docs: API sözleşmesi ve backend belgeleri"`

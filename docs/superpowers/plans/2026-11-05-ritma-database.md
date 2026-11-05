# Ritma Veritabanı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'in müşteri, randevu ve oturum verilerini Neon PostgreSQL'de kalıcı tutması; `DATABASE_URL` yokken eskisi gibi bellekle çalışması.

**Architecture:** Mevcut `CustomerRepository`, `AppointmentRepository`, `SessionStore` arayüzlerinin Postgres gerçeklemeleri `repositories/postgres/` altına eklenir; servisler ve HTTP katmanı değişmez. Şema `db/migrations/*.sql` dosyalarındadır, küçük bir çalıştırıcı uygular. Bellek ve Postgres gerçeklemeleri aynı "sözleşme" testlerini paylaşır. `deps.ts` `DATABASE_URL`'e göre seçim yapar.

**Tech Stack:** Node.js 24, TypeScript, `pg` (+ `@types/pg`, kuruldu), `node:test` + `tsx`. Başka paket eklenmez.

**Spec:** `docs/superpowers/specs/2026-11-05-ritma-database-design.md`

## Global Constraints

- Yeni kütüphane ekleme (`pg` ve `@types/pg` dışında); gerekirse önce kullanıcıya sor.
- Dosya ve klasör adları İngilizce. Şema dosyaları repo kökündeki `db/` altındadır; kod `backend/` altındadır.
- API sözleşmesi ve servis davranışı değişmez: `openapi.yaml` güncellenmez, mevcut 102 test bellekle aynen geçmeye devam eder.
- Tarih `YYYY-MM-DD`, saat `HH:MM` metni; `pg` `date`/`time` değerleri bu biçimde döner (`Date` nesnesi dönmez, gün kaymaz).
- Çakışma kuralı: aynı kullanıcı, iptal edilmemiş iki randevu aynı gün kesişemez; bir randevu `11:00`'da biterken diğeri `11:00`'da başlayabilir.
- Oturum jetonu veritabanına düz değil SHA-256 özeti (hex) olarak yazılır; `Session.token` çağırana düz jeton olarak döner.
- `.env` dosyasını okuma (yasaklı). Gerçek `DATABASE_URL`'e yalnızca `db:check`, `db:migrate` ve sunucu dokunur; testler `TEST_DATABASE_URL` kullanır, tanımsızsa Postgres testleri atlanır.
- Bağlantı adresi hiçbir çıktıya, hata mesajına veya log'a yazılmaz.
- Backend'i TDD ile geliştir; `npm test` tipleri denetlemez, bitirmeden önce ayrıca `npm run build` çalıştır. Tek dosya: `node --import tsx --test src/<yol>.test.ts` (`backend/` içinde).
- Commit atma ve push yapma kullanıcının açık onayına bağlıdır; plandaki commit adımlarını yürütücü komut çalıştırmadan önce onay alarak uygular. Çalışma `feat/db-setup` branch'inde sürer, `main`'e doğrudan commit yok.

## Review Focus

1. Tarih/saat kayması: `birth_date` `'2000-01-01'`, randevu `date` `'2026-11-05'`, saatler `'09:30'` olarak (ne `Date` ne `'09:30:00'`) geri okunur — Task 2 ve 3.
2. Ardışık randevu: `10:00–11:00` ve `11:00–12:00` birlikte kabul edilir — Task 3.
3. İptal edilmiş randevu yerini tutmaz; iptal edilmişi `scheduled`'a geri çevirmek dolu bir aralığa denk gelirse reddedilir (güncelleme yolu) — Task 3.
4. Aynı aralığa iki eşzamanlı `saveIfNoConflict`: tam biri kazanır — Task 3.
5. Bilinmeyen ya da bozuk jeton `find`'da hata fırlatmaz, `undefined` döner; silinen oturum bulunamaz — Task 4.
6. Migration yarıda hata verirse o dosya geri alınır, kayda geçmez; ikinci çalıştırma işlem yapmaz — Task 1.
7. `DATABASE_URL` tanımlı ama ulaşılamıyorsa sunucu açıklayıcı hatayla kapanır, belleğe düşmez — Task 5.

---

### Task 1: Şema, migration çalıştırıcı ve test altyapısı

**Files:**
- Create: `db/migrations/001_init.sql`
- Create: `backend/src/db/pool.ts`
- Create: `backend/src/db/migrate.ts`
- Create: `backend/src/test-db.ts`
- Create: `backend/scripts/migrate.ts`
- Test: `backend/src/db/migrate.test.ts`
- Modify: `backend/tsconfig.json` (`exclude`'a `src/test-db.ts`), `backend/package.json` (`db:migrate` script), `backend/.env.example` (`TEST_DATABASE_URL`)

**Interfaces:**
- Produces: `createPool(databaseUrl: string): pg.Pool` (`db/pool.ts`; havuz `date` (OID 1082) ve `time` (OID 1083) için tür çözücüleri kurar: `date` olduğu gibi `'YYYY-MM-DD'`, `time` ilk 5 karakter `'HH:MM'`. Çözücüler `pg.types` yerine havuz oluşturulurken `types` seçeneğiyle verilir, global durum değişmez).
- Produces: `runMigrations(pool: pg.Pool, dir: string): Promise<string[]>` (`db/migrate.ts`; `dir` içindeki `.sql` dosyalarını ada göre sırayla, her biri tek transaction'da uygular, `schema_migrations(name text primary key, applied_at timestamptz not null default now())` tablosuna yazar; bu çalışmada yeni uygulanan dosya adlarını döndürür).
- Produces: `MIGRATIONS_DIR: string` (`db/migrate.ts`; `path.resolve(import.meta.dirname, '../../../db/migrations')`).
- Produces: `openTestDb(): Promise<{ pool: pg.Pool; reset(): Promise<void>; close(): Promise<void> }>` (`src/test-db.ts`): rastgele adlı bir şema açar, tek bağlantılı (`max: 1`) havuz kurar, her bağlantıda `SET search_path TO <şema>, public` çalıştırır, migration'ları uygular. `reset()` dört veri tablosunu `TRUNCATE ... CASCADE` ile boşaltır; `close()` şemayı `DROP SCHEMA ... CASCADE` ile siler ve havuzu kapatır. Depo test dosyaları `before`'da `openTestDb()`, her `setup`'ta `reset()`, `after`'da `close()` çağırır.
- Produces: `withTestDb(run: (pool: pg.Pool) => Promise<void>): Promise<void>` (`src/test-db.ts`; `openTestDb` + `run` + `close`, hata olsa da kapatır) ve `testDbEnabled: boolean` (`TEST_DATABASE_URL` tanımlıysa true). Not: `TEST_DATABASE_URL` Neon'un **doğrudan** (pooled olmayan) bağlantı adresi olmalı; `.env.example`'a bu not yazılır.

- [ ] **Step 1: Şemayı yaz — `db/migrations/001_init.sql`.** Spec'teki "Şema" bölümünün tamamı: `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;`, `users` (+ `lower(email)` üzerinde tekil dizin), `customers` (+ kısmi dizin), `appointments` (CHECK'ler, `EXCLUDE USING gist (user_id WITH =, tsrange(date + start_time, date + end_time) WITH &&) WHERE (status <> 'cancelled')`, `(user_id, date)` dizini), `sessions` (`token_hash` PK, `user_id` `ON DELETE CASCADE`). Tablo ve sütun adları spec'tekiyle birebir. Yabancı anahtar sütunları ve `id`'ler `text`.
- [ ] **Step 2: Başarısız testi yaz — `src/db/migrate.test.ts`.** Tüm testler `{ skip: !testDbEnabled }`. (a) `withTestDb` içinde `information_schema.tables`'tan `users, customers, appointments, sessions, schema_migrations` tablolarının hepsi bulunur; `runMigrations` ikinci kez çağrılınca `[]` döner. (b) Geçici bir klasöre (`os.tmpdir()`) `001_ok.sql` (`create table t1(id int);`) ve `002_bad.sql` (`create table t2(id int); select 1/0;`) yazılır; `runMigrations` reddedilir, `t1` var, `t2` yok, `schema_migrations`'ta yalnızca `001_ok.sql` kayıtlı (Review Focus 6). (c) `createPool` üzerinden `select '2000-01-01'::date as d, '09:30'::time as t` → `{ d: '2000-01-01', t: '09:30' }` (Review Focus 1). Gerçek `TEST_DATABASE_URL` yoksa çalıştırınca testler atlanır; kırmızı adımı doğrulamak için kullanıcıdan Neon'da ayrı bir branch açıp `backend/.env`'e `TEST_DATABASE_URL` eklemesini iste ve `test` script'inin `.env`'i yüklemediğini unutma: testi `node --env-file=.env --import tsx --test src/db/migrate.test.ts` ile çalıştır.
- [ ] **Step 3: Testi çalıştır, import hatasıyla başarısız olduğunu doğrula** (`pool.ts`, `migrate.ts`, `test-db.ts` yok).
- [ ] **Step 4: `pool.ts`, `migrate.ts`, `test-db.ts`'i yaz** (imzalar yukarıda). `runMigrations` için tek bağlantı alıp her dosyada `BEGIN` / `COMMIT` / hata olursa `ROLLBACK` ve hatayı yeniden fırlatma; kayıt satırı aynı transaction içinde yazılır. `schema_migrations` tablosu transaction dışında `CREATE TABLE IF NOT EXISTS` ile açılır.
- [ ] **Step 5: `scripts/migrate.ts` ve `package.json`'a `"db:migrate": "node --env-file-if-exists=.env --import tsx scripts/migrate.ts"` ekle.** Betik `loadConfig`'ten `databaseUrl`'i alır, yoksa `db-check.ts`'tekine benzer Türkçe hata ve `exit 1`; varsa `runMigrations(createPool(url), MIGRATIONS_DIR)` çalıştırır, uygulanan dosyaları (ya da "Yeni migration yok") yazar, havuzu kapatır. `.env.example`'a `TEST_DATABASE_URL=` (açıklamalı) ekle; `tsconfig.json` `exclude`'a `src/test-db.ts` ekle.
- [ ] **Step 6: Testleri çalıştır.** `TEST_DATABASE_URL` ile: Step 2'deki komut → tümü geçer. `TEST_DATABASE_URL` olmadan `npm test` → Postgres testleri atlanır, 102 test geçmeye devam eder. `npm run build` temiz.
- [ ] **Step 7: Commit** (onayla): `feat: veritabanı şeması ve migration çalıştırıcı`.

---

### Task 2: Müşteri deposu ve ortak sözleşme testleri

**Files:**
- Create: `backend/src/repositories/contract/customer-repository.contract.ts`
- Create: `backend/src/repositories/postgres/customer-repository.ts`
- Test: `backend/src/repositories/postgres/customer-repository.test.ts`
- Modify: `backend/src/repositories/memory/customer-repository.test.ts` (sözleşmeyi de çağırır)

**Interfaces:**
- Consumes: `withTestDb`, `testDbEnabled` (Task 1); `CustomerRepository` (`repositories/types.ts`).
- Produces: `RepoContext` (`contract/customer-repository.contract.ts`'den dışa aktarılır): `{ seedUser(id: string): Promise<void> }`; Postgres gerçeklemesi `users`'a satır yazar, bellek no-op.
- Produces: `customerRepositoryContract(label: string, setup: () => Promise<{ repo: CustomerRepository } & RepoContext>, options?: { skip?: boolean }): void` — `node:test` testlerini kaydeder.
- Produces: `class PostgresCustomerRepository implements CustomerRepository` — `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Sözleşme testlerini yaz (`customerRepositoryContract` gövdesi).** Her test `setup()` ile temiz depo kurar, gerekli kullanıcıları `seedUser` ile ekler. Senaryolar: `create` sonra `findById` aynı müşteriyi döndürür (`birthDate: '2000-01-01'` metin olarak, Review Focus 1); başka kullanıcı `findById` ile `undefined` alır; `listActive` yalnızca o kullanıcının silinmemişlerini döndürür; `update` ile `deletedAt` dolu müşteri `listActive`'ten düşer ama `findById` ile hâlâ bulunur; `update` ad değişikliğini yazar.
- [ ] **Step 2: Sözleşmeyi bellek testinden çağır** (`customer-repository.test.ts` sonuna `customerRepositoryContract('memory', async () => ({ repo: new MemoryCustomerRepository(), seedUser: async () => {} }))`). Çalıştır → geçmeli (sözleşme bellek davranışıyla uyumlu olduğunu kanıtlar; uyumsuz bir senaryo çıkarsa sözleşmeyi değil, bellek davranışını referans al ve sözleşmeyi düzelt).
- [ ] **Step 3: Postgres testini yaz** (`postgres/customer-repository.test.ts`): dosyada `before`'da `openTestDb()`, `after`'da `close()` çağrılır; sözleşmenin `setup`'ı `reset()` çağırıp yeni `PostgresCustomerRepository(pool)` döndürür (`seedUser` `users`'a satır yazar). `{ skip: !testDbEnabled }`. Çalıştır → `PostgresCustomerRepository` yok, başarısız.
- [ ] **Step 4: `PostgresCustomerRepository`'yi yaz.** Sütun ↔ alan eşlemesi (`first_name` ↔ `firstName`, `deleted_at` `timestamptz` ↔ ISO metin ya da `null`); `update`, `id` ile `UPDATE` yapar; `listActive` `deleted_at IS NULL`. `deletedAt` değeri kullanıcının verdiği ISO metni olduğu gibi kaydedilip okununca `toISOString()` ile aynı biçime dönmelidir.
- [ ] **Step 5: Testleri çalıştır** (`--env-file=.env` ile Postgres, ardından `.env`'siz `npm test` + `npm run build`).
- [ ] **Step 6: Commit** (onayla): `feat: müşteri deposunun Postgres gerçeklemesi`.

---

### Task 3: Randevu deposu

**Files:**
- Create: `backend/src/repositories/contract/appointment-repository.contract.ts`
- Create: `backend/src/repositories/postgres/appointment-repository.ts`
- Test: `backend/src/repositories/postgres/appointment-repository.test.ts`
- Modify: `backend/src/repositories/memory/appointment-repository.test.ts`

**Interfaces:**
- Consumes: `RepoContext` (Task 2), `AppointmentRepository`, `withTestDb`.
- Produces: `appointmentRepositoryContract(label, setup: () => Promise<{ repo: AppointmentRepository; seedCustomer(userId: string, customerId: string): Promise<void> } & RepoContext>, options?)` — Postgres'te `seedCustomer` `customers`'a satır yazar, bellek no-op.
- Produces: `class PostgresAppointmentRepository implements AppointmentRepository` — `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Sözleşme testlerini yaz.** Mevcut `appointment-repository.test.ts`'teki davranışlara ek olarak: `10:00–11:00` varken `11:00–12:00` kaydedilir (Review Focus 2); `10:30–11:30` `undefined` döner ve yazılmaz; iptal edilmiş `10:00–11:00` varken aynı aralık kaydedilir; iptal edilmiş randevuyu `scheduled`'a çevirmek, aynı aralıkta başka aktif randevu varken `undefined` döner (Review Focus 3); başka kullanıcının aynı aralığı çakışma sayılmaz; `findById`/`delete` başka kullanıcı için `undefined`/`false`; `listByDateRange` iki ucu dahil ve tarih+başlangıç sırasıyla; `Promise.all` ile aynı aralığa iki farklı randevu → sonuçlardan tam biri `undefined` (Review Focus 4); `date: '2026-11-05'`, `startTime: '09:30'` geri okununca aynen kalır (Review Focus 1).
- [ ] **Step 2: Bellek testinden sözleşmeyi çağır, çalıştır → geçmeli** (eşzamanlılık senaryosu bellekte de geçer).
- [ ] **Step 3: Postgres test dosyasını yaz** (Task 2 Step 3'teki `openTestDb`/`reset` düzeni; `seedCustomer` `customers`'a satır yazar, `{ skip: !testDbEnabled }`), çalıştır → başarısız.
- [ ] **Step 4: `PostgresAppointmentRepository`'yi yaz.** `saveIfNoConflict`: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` (hangi sütunların güncellendiğini `id` ve `user_id` dışındaki tüm alanlar belirler); SQLSTATE `23P01` (exclusion_violation) yakalanır ve `undefined` döner, diğer hatalar yeniden fırlatılır. `listByDateRange` `ORDER BY date, start_time`. `delete` etkilenen satır sayısı > 0 ise `true`.
- [ ] **Step 5: Testleri çalıştır** (Postgres + `.env`'siz tam `npm test` + `npm run build`).
- [ ] **Step 6: Commit** (onayla): `feat: randevu deposunun Postgres gerçeklemesi`.

---

### Task 4: Oturum deposu

**Files:**
- Create: `backend/src/repositories/contract/session-store.contract.ts`
- Create: `backend/src/repositories/postgres/session-store.ts`
- Test: `backend/src/repositories/postgres/session-store.test.ts`
- Modify: `backend/src/repositories/memory/session-store.test.ts`

**Interfaces:**
- Consumes: `RepoContext`, `SessionStore`, `Session`.
- Produces: `sessionStoreContract(label, setup: () => Promise<{ store: SessionStore } & RepoContext>, options?)`; `class PostgresSessionStore implements SessionStore` — `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Sözleşme testlerini yaz.** Mevcut bellek testlerinin karşılığı (oluşturulan oturum bulunur, `delete`'ten sonra bulunamaz, iki jeton farklı ve `/^[0-9a-f]{64}$/`) ek olarak: `find('yok')` ve `find('')` `undefined` döner, hata fırlatmaz (Review Focus 5); `create`'in döndürdüğü `createdAt` ISO metin; `delete` olmayan jeton için hata vermez.
- [ ] **Step 2: Bellek testinden çağır, çalıştır → geçmeli.**
- [ ] **Step 3: Postgres test dosyasını yaz** (`openTestDb`/`reset` düzeni) ve ek bir test: oturum satırında düz jeton yok — `select token_hash from sessions` değeri `session.token`'a eşit değil ve `/^[0-9a-f]{64}$/`'e uyar. Çalıştır → başarısız.
- [ ] **Step 4: `PostgresSessionStore`'u yaz.** `create`: `randomBytes(32).toString('hex')` jeton, özet `createHash('sha256').update(token).digest('hex')`, satır `sessions(token_hash, user_id)`; döndürülen `Session.token` düz jeton. `find`/`delete` gelen jetonu özetleyip `token_hash` ile arar.
- [ ] **Step 5: Testleri çalıştır** (Postgres + `.env`'siz tam `npm test` + `npm run build`).
- [ ] **Step 6: Commit** (onayla): `feat: oturum deposunun Postgres gerçeklemesi`.

---

### Task 5: `deps.ts` bağlantısı ve demo kullanıcılar

**Files:**
- Modify: `backend/src/deps.ts`, `backend/src/server.ts`, `backend/src/e2e.test.ts`, `backend/src/auth/demo-identity-provider.ts`
- Create: `backend/src/db/users.ts`
- Test: `backend/src/db/users.test.ts`, `backend/src/deps.test.ts`; ek olarak `backend/src/e2e-postgres.test.ts`

**Interfaces:**
- Consumes: `createPool`, `Postgres*` gerçeklemeleri, `loadConfig().databaseUrl`.
- Produces: `buildDeps(env: NodeJS.ProcessEnv): Promise<AppDeps>` (artık async; `AppDeps` kendisine `close?: () => Promise<void>` eklemez — havuz süreç boyunca açık kalır).
- Produces: `upsertUsers(pool: pg.Pool, users: readonly User[]): Promise<void>` (`db/users.ts`; `id`'ye göre `INSERT ... ON CONFLICT (id) DO UPDATE SET email, display_name`).
- Produces: `DEMO_USERS: readonly User[]` — `demo-identity-provider.ts`'te mevcut sabit listenin yalnızca `User` kısmı dışa aktarılır (parolalar dışa aktarılmaz).

- [ ] **Step 1: `users.test.ts`'i yaz** (`{ skip: !testDbEnabled }`): `upsertUsers` iki kez çağrılınca satır sayısı değişmez; `display_name` değişince güncellenir.
- [ ] **Step 2: `deps.test.ts`'i yaz** (Postgres gerektirmez): `await buildDeps({})` bellek depolarıyla çalışır ve oturum açılabilir; `await buildDeps({ DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db' })` reddedilir, mesaj `DATABASE_URL`/bağlantı kurulamadığını söyler ve adresin kendisini (`u:p@`) içermez (Review Focus 7). Çalıştır → `buildDeps` hâlâ senkron/bağlanmıyor, başarısız.
- [ ] **Step 3: `e2e-postgres.test.ts`'i yaz** (`{ skip: !testDbEnabled }`): `withTestDb` havuzuyla Postgres depolarından kurulan `AppDeps` ile `startTestServer`; Ayşe giriş yapar, müşteri oluşturur, randevu oluşturur (`201`), aynı aralığa ikinci randevu `409`, ardından yeni bir `PostgresSessionStore`/depolarla kurulan ikinci uygulama örneği aynı verileri döndürür (kalıcılık). Demo kullanıcılar `upsertUsers(pool, DEMO_USERS)` ile eklenmiş olarak başlar.
- [ ] **Step 4: `upsertUsers`, `DEMO_USERS` dışa aktarımı ve `buildDeps`'i yaz.** `databaseUrl` varsa: `createPool`, `SELECT 1` ile bağlantıyı doğrula (hata → adresi içermeyen Türkçe mesajla fırlat), `config.demoAccountsEnabled` ise `upsertUsers(pool, DEMO_USERS)`, depoları Postgres gerçeklemeleriyle kur; yoksa mevcut bellek kurulumu. `server.ts`'te `await buildDeps(process.env)`; bağlantı hatasında mesajı yazıp `process.exit(1)`. `e2e.test.ts`'teki üç `buildDeps` çağrısına `await` ekle.
- [ ] **Step 5: Testleri çalıştır.** `.env`'siz `npm test` (hepsi geçer, Postgres testleri atlanır), `--env-file=.env` ile `db/users`, `deps`, `e2e-postgres` testleri, `npm run build`.
- [ ] **Step 6: Commit** (onayla): `feat: DATABASE_URL varsa Postgres depolarını kullan`.

---

### Task 6: Gerçek veritabanında doğrulama ve belgeler

**Files:**
- Modify: `CLAUDE.md` (Backend bölümü), `docs/superpowers/specs/2026-11-05-ritma-database-design.md` (yalnızca gerçeklemede değişen bir karar olduysa)

- [ ] **Step 1: Migration'ı gerçek veritabanına uygula:** `npm run db:migrate` (`backend/` içinde). Beklenen: `001_init.sql` uygulandı; ikinci çalıştırma "Yeni migration yok".
- [ ] **Step 2: Sunucuyu başlat** (`npm run dev`, "Ritma http://localhost:3000 adresinde çalışıyor" satırını bekle) ve tarayıcıda/`fetch` ile: Ayşe ile giriş → müşteri ve randevu ekle → aynı saate ikinci randevu `409` → sunucuyu durdur ve yeniden başlat → tekrar giriş, müşteri ve randevu yerinde. Spec'teki başarı ölçütünün üç maddesi (kalıcılık, `409`, `DATABASE_URL`'siz çalışma) tek tek kontrol edilir; sonuncusu için `.env`'siz bir `npm test` yeterlidir. İş bitince sunucuyu ve sekmeyi kapat (CLAUDE.md'deki `netstat`/`taskkill` yolu).
- [ ] **Step 3: `CLAUDE.md` Backend bölümünü güncelle:** "veriler bellekte" cümlesini "`DATABASE_URL` varsa Postgres (Neon), yoksa bellek" olarak düzelt; `npm run db:migrate`, `db:check`, `TEST_DATABASE_URL` (Neon'un doğrudan adresi, Postgres testleri yoksa atlanır) ve `db/migrations` yerleşimini ekle; `repositories/postgres/` ve `contract/` klasörlerini yerleşim satırına yaz.
- [ ] **Step 4: Tüm testleri ve derlemeyi son kez çalıştır** (`npm test`, `npm run build`, `--env-file=.env` ile Postgres testleri) ve çıktıyı doğrula.
- [ ] **Step 5: Commit** (onayla): `docs: CLAUDE.md veritabanı bilgileriyle güncellendi`. Ardından PR açma ve merge kullanıcıyla birlikte yapılır.

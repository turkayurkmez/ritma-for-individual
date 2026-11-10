# Ritma Google ile Giriş ve "İki Hafta Ücretsiz Dene" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcılar Google hesabıyla Ritma'ya girebilsin (ilk girişte hesap kendiliğinden açılsın), panelin üstünde "İki hafta ücretsiz dene" şeridi görünsün ve tanıtım sayfasında "Erken erişim" kalksın.

**Architecture:** Tarayıcıdaki Google düğmesi bir kimlik belgesi (ID token) verir; `POST /api/v1/auth/google` bunu Google'ın `tokeninfo` adresiyle doğrular, tek kaynak olan yeni kullanıcı deposunda kişiyi `google_sub`'a göre bulur ya da oluşturur ve bugünkü girişle aynı oturum çerezini verir. Demo kullanıcılar da aynı depoya konur; böylece oturumdan kullanıcıyı bulma tek yerden yapılır. Client ID `GOOGLE_CLIENT_ID` ortam değişkeninden gelir, ön yüz bunu `GET /api/v1/auth/config`'ten öğrenir; boşsa Google düğmesi hiç görünmez.

**Tech Stack:** Node.js + Express + TypeScript (node:test + tsx), PostgreSQL (`pg`), React + TypeScript + Vite + Vitest. Yeni npm bağımlılığı yok.

**Spec:** `docs/superpowers/specs/2026-11-10-ritma-google-auth-design.md` (uygulayıcılar planla birlikte onu da okur)

## Global Constraints

- Yeni npm kütüphanesi eklenmez. Ön yüz bağımlılıkları yalnızca `react`, `react-dom`, `react-router` (+ listedeki geliştirme paketleri). Google'ın `https://accounts.google.com/gsi/client` betiği tarayıcıda yüklenen harici betiktir, bağımlılık değil.
- Veritabanı değişikliği yeni numaralı dosyayla yapılır: depo kökündeki `db/migrations/002_google_identity.sql` (`001_init.sql` değiştirilmez; `backend/` altında değil).
- Yeni rotalar `api-contract/openapi.yaml`'a yazılır; `backend/src/contract.test.ts` rota listesini kontrol eder.
- Backend TDD ile yazılır: önce başarısız test, sonra kod. `npm test` (tsx) tipleri denetlemez; her görevin sonunda ayrıca `npm run build` çalıştırılır.
- Postgres testleri yalnızca `TEST_DATABASE_URL` varsa çalışır, yoksa atlanır; bellek ve Postgres depoları aynı davranış testlerini (`repositories/contract/`) paylaşır.
- Hata biçimi `{ "error": { "code", "message" } }`. Kodlar: `validation_error` 400, `unauthorized` 401, `not_found` 404, `conflict` 409, yeni `upstream_error` 502.
- Arayüz metinleri Türkçe ve sade. Birebir metinler: şerit **"İki hafta ücretsiz dene"**; ayırıcı **"veya demo hesapla"**; boş durum düğmesi **"Müşteri ekle"**; tanıtım düğmesi **"İki hafta ücretsiz dene"**.
- Gerçek Client ID ya da gizli bilgi depoya girmez. `backend/.env` okunamaz ve git'e girmez; yalnızca `backend/.env.example` düzenlenir.
- Stiller ayrı `.css` dosyalarında, `frontend/src/styles/tokens.css` değişkenleriyle (indigo vurgu, `--bw` kenarlık, monospace başlık). Telefon genişliğinde düzgün görünmeli.
- Dosya ve klasör adları İngilizce. Ön yüz testleri `fireEvent` + `stubFetch` + `renderApp` ile yazılır.
- Çalışma düzeni: iş `feat/google-auth` branch'inde yapılır. **Commit adımları yalnızca kullanıcı izin verdiğinde uygulanır** (proje kuralı: "Sormadan commit atma"); mesajı `plain-turkish-commit` skill'iyle yaz. `main`'e doğrudan commit yok.

## Review Focus

Spec'in ima ettiği ama düz akışta denenmeyecek durumlar (her satırın testi ilgili görevde):

1. Aynı Google hesabıyla aynı anda iki ilk giriş (çift tıklama, iki sekme): tek kullanıcı oluşmalı. → Görev 2
2. Bir Google kullanıcısı başkasının müşterisini/randevusunu hiçbir şekilde görmemeli. → Görev 5
3. Client ID boşken `/giris` çökmeden açılmalı, `POST /auth/google` 404 vermeli. → Görev 5, 6
4. Google yanıt vermiyor ya da 5xx: 502 + Türkçe mesaj; giriş sayfası bunu gösterir, demo formu çalışmaya devam eder. → Görev 3, 6
5. Başka uygulamanın belgesi (`aud` farklı) ya da doğrulanmamış e-posta reddedilmeli; Google'dan ad gelmezse e-postanın baş kısmı görünen ad olmalı. → Görev 3, 4

---

### Task 1: Temel: `upstream_error`, `GOOGLE_CLIENT_ID` yapılandırması

**Files:**
- Modify: `backend/src/domain/errors.ts`
- Modify: `backend/src/config.ts`, `backend/src/config.test.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `upstreamError(message: string): AppError` (status 502, code `'upstream_error'`); `ErrorCode` birleşimine `'upstream_error'`, `AppError.status` birleşimine `502`. `Config.googleClientId: string | undefined`.

- [ ] **Step 1: `feat/google-auth` branch'ini aç.** `git switch -c feat/google-auth` (bekleyen `.claude/settings.json` değişikliği bu iş değil; plana katma, `git add` listelerine koyma).
- [ ] **Step 2: Başarısız testi yaz** (`config.test.ts`): mevcut ilk testin `deepEqual`'ına `googleClientId: undefined` ekle; yeni test `GOOGLE_CLIENT_ID is read when set, trimmed, and empty counts as unset`: `loadConfig({ GOOGLE_CLIENT_ID: ' abc.apps.googleusercontent.com ' }).googleClientId === 'abc.apps.googleusercontent.com'`, `loadConfig({ GOOGLE_CLIENT_ID: '' }).googleClientId === undefined`.
- [ ] **Step 3: Çalıştır, düştüğünü gör.** `cd backend && node --import tsx --test src/config.test.ts` → FAIL.
- [ ] **Step 4: Uygula.** `Config`'e `googleClientId`, `loadConfig`'e `env.GOOGLE_CLIENT_ID?.trim() || undefined`. `errors.ts`'e `upstream_error`/502 ve `upstreamError`. `.env.example`'a, mevcut yorum üslubuyla, boş `GOOGLE_CLIENT_ID=` satırı: "Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID (Web). Boşsa Google ile giriş kapalıdır. Yetkili JavaScript kaynağı olarak `http://localhost:3000` ve canlı adresi ekle."
- [ ] **Step 5: Çalıştır.** `node --import tsx --test src/config.test.ts` → PASS; `npm run build` → hatasız.
- [ ] **Step 6: Commit (izinle).** `git add backend/src/domain/errors.ts backend/src/config.ts backend/src/config.test.ts backend/.env.example docs/superpowers/specs/2026-11-10-ritma-google-auth-design.md docs/superpowers/plans/2026-11-10-ritma-google-auth.md`

---

### Task 2: Kullanıcı deposu (bellek + Postgres) ve migration

**Files:**
- Modify: `backend/src/repositories/types.ts`
- Create: `backend/src/repositories/contract/user-repository.contract.ts`
- Create: `backend/src/repositories/memory/user-repository.ts`, `backend/src/repositories/memory/user-repository.test.ts`
- Create: `backend/src/repositories/postgres/user-repository.ts`, `backend/src/repositories/postgres/user-repository.test.ts`
- Create: `db/migrations/002_google_identity.sql`
- (Gerekirse) Modify: `backend/src/db/migrate.test.ts` — migration adlarını/sayısını sabit yazıyorsa 002'yi ekle.

**Interfaces:**
- Produces:
  ```ts
  // repositories/types.ts
  export interface UserRepository {
    findById(id: string): Promise<User | undefined>;
    /** Aynı googleSub varsa o kullanıcıyı döndürür (e-posta/ad güncellenmez); yoksa yeni kullanıcı açar.
     *  E-posta (büyük/küçük harf fark etmez) başka bir kullanıcıda varsa hiçbir şey yazmadan `undefined` döner. */
    findOrCreateByGoogle(input: { googleSub: string; email: string; displayName: string }): Promise<User | undefined>;
  }
  ```
  `new MemoryUserRepository(seed: readonly User[] = [])`, `new PostgresUserRepository(pool: pg.Pool)`. Yeni kullanıcı kimliği `user-` + `randomUUID()`.
- Consumes: `User` (`domain/types.ts`), `openTestDb`/`testDbEnabled` (`test-db.ts`).

- [ ] **Step 1: Ortak davranış testlerini yaz** (`user-repository.contract.ts`, `userRepositoryContract(label, setup: () => Promise<{ repo: UserRepository }>, options: { skip?: boolean } = {})`, `session-store.contract.ts` kalıbında). Testler (hepsinde `sub-1` / `a@gmail.com` / `Ayşe`):
  - `creates a user for a new Google identity with a generated id`: dönen kullanıcının `email`, `displayName` değerleri verilenler, `id` `/^user-[0-9a-f-]{36}$/`, `findById(id)` aynı kullanıcıyı verir.
  - `returns the same user for the same Google identity and does not update email or name`: ikinci çağrı farklı e-posta/adla yapılır; `id` aynı, `email`/`displayName` ilk değerler.
  - `concurrent first sign-ins create exactly one user`: aynı `googleSub` ile `Promise.all` 5 çağrı; `new Set(ids).size === 1`.
  - `returns undefined when the email belongs to another Google identity, ignoring case`: `sub-1`/`a@gmail.com` sonra `sub-2`/`A@Gmail.com` → `undefined`; `sub-2` ile tekrar denenince yine `undefined` (hiçbir şey yazılmadı).
  - `findById returns undefined for an unknown id`.
- [ ] **Step 2: Bellek testi** (`memory/user-repository.test.ts`): `userRepositoryContract('memory', async () => ({ repo: new MemoryUserRepository() }))` + `seed users can be found by id and block their email`: `new MemoryUserRepository([{ id: 'demo-user-ayse', email: 'ayse@ritma.demo', displayName: 'Ayşe Demir' }])`; `findById('demo-user-ayse')` bulunur; `findOrCreateByGoogle({ googleSub: 'x', email: 'AYSE@ritma.demo', displayName: 'Başkası' })` → `undefined`.
- [ ] **Step 3: Çalıştır, düştüğünü gör.** `node --import tsx --test src/repositories/memory/user-repository.test.ts` → FAIL (modül yok).
- [ ] **Step 4: `UserRepository` arayüzünü ve `MemoryUserRepository`'yi uygula.** E-posta karşılaştırması `toLowerCase()`; işlem tek senkron blok olduğu için eşzamanlılık testi geçer.
- [ ] **Step 5: Migration yaz** (`002_google_identity.sql`): `ALTER TABLE users ADD COLUMN google_sub text;` ve `CREATE UNIQUE INDEX users_google_sub_unique ON users (google_sub) WHERE google_sub IS NOT NULL;` (başına `001`'deki gibi spec yolunu gösteren Türkçe yorum).
- [ ] **Step 6: Postgres gerçeklemesi + testi.** `PostgresUserRepository.findOrCreateByGoogle`: `INSERT INTO users (id, email, display_name, google_sub) VALUES (...) ON CONFLICT DO NOTHING RETURNING id, email, display_name`; satır dönmediyse `SELECT ... WHERE google_sub = $1`; o da yoksa `undefined` (e-posta başkasında). Hedefsiz `ON CONFLICT DO NOTHING` hem `google_sub` hem `lower(email)` çakışmasını yutar, eşzamanlı iki çağrı da güvenle tek satır bırakır. Test dosyası `session-store.test.ts` kalıbında: `userRepositoryContract('postgres', async () => { await db.reset(); return { repo: new PostgresUserRepository(db.pool) }; }, { skip: !testDbEnabled })` + `[postgres] a demo user row with the same email blocks the Google account` (SQL ile `ayse@ritma.demo` satırı ekle, Google ile aynı e-posta → `undefined`).
- [ ] **Step 7: Çalıştır.** `node --import tsx --test src/repositories/memory/user-repository.test.ts src/repositories/postgres/user-repository.test.ts` → bellek PASS, Postgres atlanır (ya da `TEST_DATABASE_URL` varsa PASS); `npm test` ve `npm run build` hatasız.
- [ ] **Step 8: Commit (izinle).** `git add backend/src/repositories db/migrations/002_google_identity.sql backend/src/db`

---

### Task 3: Google belge doğrulayıcı

**Files:**
- Create: `backend/src/auth/google-token-verifier.ts`, `backend/src/auth/google-token-verifier.test.ts`

**Interfaces:**
- Consumes: `unauthorized`, `upstreamError` (`domain/errors.ts`).
- Produces:
  ```ts
  export interface GoogleIdentity { sub: string; email: string; name?: string }
  export interface GoogleTokenVerifier { verify(credential: string): Promise<GoogleIdentity> }
  export function createTokeninfoVerifier(
    clientId: string,
    options?: { fetch?: typeof fetch; timeoutMs?: number; now?: () => number },
  ): GoogleTokenVerifier;
  ```
  Mesajlar (birebir): geçersiz → `'Google kimliği geçersiz ya da süresi dolmuş.'` (401); e-posta doğrulanmamış → `'Google hesabının e-postası doğrulanmamış.'` (401); ulaşılamıyor → `'Google ile bağlantı kurulamadı, biraz sonra tekrar dene.'` (502 `upstream_error`).

- [ ] **Step 1: Başarısız testleri yaz** (sahte `fetch` ile; gerçek Google'a istek atılmaz; `Response` nesneleri döndür). Geçerli yanıt gövdesi: `{ aud: 'cid', iss: 'https://accounts.google.com', sub: 's1', email: 'a@gmail.com', email_verified: 'true', name: 'Ayşe', exp: String(Math.floor(now/1000) + 3600) }`:
  - `returns the identity for a valid token and asks tokeninfo with the encoded id_token`: çağrılan adres `https://oauth2.googleapis.com/tokeninfo?id_token=` + `encodeURIComponent(credential)`; sonuç `{ sub: 's1', email: 'a@gmail.com', name: 'Ayşe' }`.
  - `accepts iss "accounts.google.com" without the scheme`.
  - `rejects a token that Google calls invalid (HTTP 400) with 401`.
  - `rejects a token issued for another client id with the same generic message` (`aud` farklı).
  - `rejects an unknown issuer`, `rejects an expired token` (`exp` geçmişte, `now` enjekte edilir).
  - `rejects an unverified email with its own message` (`email_verified: 'false'` ve alanın hiç olmaması).
  - `rejects a response without sub or email`.
  - `maps a network failure, a 5xx, a non-JSON 200 body and a timeout to 502 upstream_error`: zaman aşımı için `fetch`, `init.signal` abort edilince reddeden asla çözülmeyen bir söz döndürür, `timeoutMs: 20`.
  - Hata gövdesinde/mesajında belgenin kendisi geçmez (`assert.ok(!error.message.includes(credential))`).
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/auth/google-token-verifier.test.ts` → FAIL.
- [ ] **Step 3: Uygula.** `fetch(url, { signal: AbortSignal.timeout(timeoutMs ?? 5000) })`; yanıt 4xx → 401 geçersiz; 5xx/ağ hatası/zaman aşımı/JSON olmayan gövde → `upstreamError`; sonra `aud === clientId`, `iss` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `Number(exp) * 1000 > now()`, `email_verified === 'true'` (aksi halde doğrulanmamış mesajı), `sub` ve `email` dolu. `name` boş/yoksa `undefined`. Belgeyi hiçbir yere loglama.
- [ ] **Step 4: Çalıştır.** Aynı komut → PASS; `npm run build` hatasız.
- [ ] **Step 5: Commit (izinle).** `git add backend/src/auth/google-token-verifier.ts backend/src/auth/google-token-verifier.test.ts`

---

### Task 4: `SessionService` ve bağlantılar (tek kullanıcı kaynağı)

**Files:**
- Modify: `backend/src/auth/identity-provider.ts`, `backend/src/auth/demo-identity-provider.ts`, `backend/src/auth/demo-identity-provider.test.ts`
- Modify: `backend/src/auth/session-service.ts`, `backend/src/auth/session-service.test.ts`
- Modify: `backend/src/deps.ts`, `backend/src/deps.test.ts`, `backend/src/test-support.ts`

**Interfaces:**
- Consumes: `UserRepository` (Görev 2), `GoogleTokenVerifier` (Görev 3), `DEMO_USERS`.
- Produces:
  ```ts
  // identity-provider.ts: findUser KALKAR
  export interface IdentityProvider { authenticate(credentials: Credentials): Promise<User | undefined> }
  // session-service.ts
  new SessionService(provider: IdentityProvider, store: SessionStore, users: UserRepository, google?: GoogleTokenVerifier)
  sessions.loginWithGoogle(credential: string): Promise<{ token: string; user: User }>
  // test-support.ts
  export function buildTestSessions(google?: GoogleTokenVerifier): SessionService   // demo sağlayıcı + MemoryUserRepository(DEMO_USERS) + MemorySessionStore
  ```
  `authenticateToken` artık yalnızca `users.findById(session.userId)` kullanır. `loginWithGoogle`: doğrulayıcı yoksa `notFound('Google ile giriş açık değil.')`; görünen ad = `identity.name?.trim()` boşsa e-postanın `@` öncesi; depo `undefined` dönerse `conflict('Bu e-posta adresi başka bir hesapta kayıtlı.')`.

- [ ] **Step 1: Başarısız testleri yaz** (`session-service.test.ts`; `setup()` artık `new SessionService(new DemoIdentityProvider(), new MemorySessionStore(), new MemoryUserRepository(DEMO_USERS))`; sahte doğrulayıcı `{ verify: async () => identity }`). Mevcut dört test aynen kalır. Yeni:
  - `loginWithGoogle opens an account on the first sign-in and returns the same user next time`: iki girişte `user.id` aynı; `authenticateToken(token).id` eşleşir.
  - `the display name falls back to the part of the email before @ when Google gives no name`: `name` yok, e-posta `ali.veli@gmail.com` → `displayName === 'ali.veli'`; boşluklardan ibaret ad da aynı yedeğe düşer.
  - `a Google user stays signed in when demo accounts are off`: sağlayıcı `{ authenticate: async () => undefined }`, kullanıcı deposu boş; `loginWithGoogle` sonra `authenticateToken` başarılı.
  - `loginWithGoogle is not_found when Google sign-in is not configured` (`google` verilmedi).
  - `loginWithGoogle is conflict when the email belongs to a demo user` (doğrulayıcı `ayse@ritma.demo` döndürür).
  - `verifier errors reach the caller unchanged` (doğrulayıcı `upstreamError(...)` fırlatır; aynı hata gelir).
  `demo-identity-provider.test.ts`'ten `findUser returns the user by id` testini sil (artık yok).
  `deps.test.ts`'e: `without GOOGLE_CLIENT_ID Google sign-in is not_found` (`buildDeps({})` → `sessions.loginWithGoogle('x')` 404 `AppError`), `with demo accounts off nobody can sign in with a password` (`buildDeps({ DEMO_ACCOUNTS_ENABLED: 'false' })` → `login(AYSE)` 401). Gerçek Google'a istek atan test yazma.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/auth/session-service.test.ts src/auth/demo-identity-provider.test.ts src/deps.test.ts` → FAIL.
- [ ] **Step 3: Uygula.** Arayüz ve `DemoIdentityProvider`'dan `findUser`'ı kaldır. `SessionService`'i yukarıdaki imzayla güncelle. `deps.ts`: `Stores`'a `users: UserRepository`; bellek modunda `new MemoryUserRepository(seedDemoUsers ? DEMO_USERS : [])`, Postgres'te `new PostgresUserRepository(pool)` (demo tohumlama mevcut `upsertUsers` ile aynen kalır); `noIdentityProvider` yalnızca `authenticate` içerir; doğrulayıcı `config.googleClientId ? createTokeninfoVerifier(config.googleClientId) : undefined`. `test-support.ts`: `buildTestSessions` ekle, `buildTestDeps` onu kullansın.
- [ ] **Step 4: Çalıştır.** Tüm backend: `npm test` → PASS (Postgres olanlar atlanabilir); `npm run build` hatasız. Mevcut HTTP testlerinin (demo girişi, `/auth/me`, müşteri/randevu) hâlâ geçtiğini doğrula.
- [ ] **Step 5: Commit (izinle).** `git add backend/src/auth backend/src/deps.ts backend/src/deps.test.ts backend/src/test-support.ts`

---

### Task 5: Rotalar, sözleşme

**Files:**
- Modify: `backend/src/http/auth-routes.ts`, `backend/src/http/auth-routes.test.ts`
- Modify: `backend/src/app.ts`, `backend/src/deps.ts`
- Modify: `api-contract/openapi.yaml`, `backend/src/contract.test.ts`

**Interfaces:**
- Consumes: `sessions.loginWithGoogle` (Görev 4), `buildTestSessions`, `config.googleClientId`.
- Produces: `createAuthRouter(sessions: SessionService, production: boolean, googleClientId?: string): Router`; `AppDeps.googleClientId?: string` (`createApp` bunu `createAuthRouter`'a geçirir, `buildDeps` `config.googleClientId` ile doldurur). Uç noktalar: `POST /api/v1/auth/google` gövde `{ credential: string }` → 200 `{ token, user }` + `ritma_session` çerezi (girişle aynı); `GET /api/v1/auth/config` (oturum gerekmez) → `{ googleClientId: string | null }`.

- [ ] **Step 1: Başarısız rota testlerini yaz** (`auth-routes.test.ts`; sahte doğrulayıcı `fakeGoogle(identity)` ve `buildTestDeps({ sessions: buildTestSessions(fakeGoogle), googleClientId: 'test-client.apps.googleusercontent.com' })`; mevcut testler değişmez):
  - `POST /auth/google signs in a new Google user with a token, an HttpOnly cookie and the user`: 200, `token` `/^[0-9a-f]{64}$/`, `Set-Cookie` `ritma_session=` + `HttpOnly`, `user.email`/`displayName`; ardından `GET /auth/me` Bearer ile 200.
  - `the same Google account signs in as the same user twice`: iki giriş, `user.id` aynı.
  - `a Google user cannot see another Google user's customers`: A (sub `a`) `POST /customers` ile `{ firstName: 'Zeynep', lastName: 'Aksoy', birthDate: '1990-01-01', gender: 'female' }` ekler; B (sub `b`, başka e-posta) `GET /customers` yanıt metni `Zeynep` içermez; B'nin `GET /appointments?from=2026-11-01&to=2026-11-30` yanıtı da A'nın verisini içermez.
  - `POST /auth/google without a usable credential is 400 validation_error` (gövdesiz, `{}`, `{ credential: 5 }`, `{ credential: '' }`).
  - `an invalid Google token is 401 unauthorized` (sahte doğrulayıcı `unauthorized(...)` fırlatır; mesaj yanıtta aynen).
  - `Google sign-in is 404 not_found when it is not configured` (`buildTestDeps()` varsayılanı; mesaj `Google ile giriş açık değil.`).
  - `a Google outage is 502 upstream_error` ve `a taken email is 409 conflict` (sahte doğrulayıcı `ayse@ritma.demo` döndürür).
  - `GET /auth/config needs no login and returns the Client ID or null`: yapılandırılmışken `'test-client.apps.googleusercontent.com'`, değilken `null`.
  `contract.test.ts` listesine, alfabetik sırada, `'GET /api/v1/auth/config'` ve `'POST /api/v1/auth/google'` ekle.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/http/auth-routes.test.ts src/contract.test.ts` → FAIL.
- [ ] **Step 3: Rotaları uygula.** `auth-routes.ts`: `/google` (gövde doğrulaması `validationError('Google kimliği metin olarak verilmelidir.')`, çerez ve yanıt `/login` ile aynı biçimde) ve `/config`. `app.ts`/`deps.ts` bağlantıları. `error-handler.ts` değişmez (502 `AppError` zaten işlenir).
- [ ] **Step 4: `openapi.yaml`'ı güncelle.** İki yol (`security: []`): `/api/v1/auth/google` (`post`; gövde `credential` zorunlu; 200 giriştekiyle aynı şema; 400 `ValidationError`, 401 `Unauthorized`, 404 `NotFound`, 409 `Conflict` yerine satır içi açıklama "E-posta başka bir hesapta kayıtlı.", 502 yeni `UpstreamError` yanıtı) ve `/api/v1/auth/config` (`get`; 200 `{ googleClientId: string, nullable }`). `components.responses.UpstreamError` ekle; `Error.code` enum'una `upstream_error` ekle.
- [ ] **Step 5: Çalıştır.** `npm test` → PASS; `npm run build` hatasız.
- [ ] **Step 6: Commit (izinle).** `git add backend/src api-contract/openapi.yaml`

---

### Task 6: Ön yüz: API, `AuthProvider`, `GoogleButton`, Login

**Files:**
- Modify: `frontend/src/api/auth.ts`, `frontend/src/auth/AuthProvider.tsx`
- Create: `frontend/src/auth/GoogleButton.tsx`, `frontend/src/auth/GoogleButton.test.tsx`
- Modify: `frontend/src/pages/login/Login.tsx`, `Login.css`, `Login.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // api/auth.ts
  export function loginWithGoogle(credential: string): Promise<User>          // POST /auth/google, skipUnauthorizedHandler
  export function fetchAuthConfig(): Promise<{ googleClientId: string | null }> // GET /auth/config
  // AuthProvider: useAuth() değerine eklenir
  loginWithGoogle(credential: string): Promise<void>
  // auth/GoogleButton.tsx
  export function GoogleButton(props: { clientId: string; onCredential: (credential: string) => void }): JSX.Element
  ```
  `GoogleButton`: `window.google?.accounts.id` varsa onu kullanır; yoksa `https://accounts.google.com/gsi/client` betiğini bir kez (`id="google-gsi"`) `document.head`'e ekler. Hazır olunca `initialize({ client_id, callback: ({ credential }) => onCredential(credential) })` ve `renderButton(kap, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'tr', width: 320 })`. Betik yüklenemezse `role="alert"` ile `Google ile giriş şu an yüklenemedi.` gösterir. `window.google` için yerel minimal tip kullan (`declare global` ya da yerel arayüz + atama).

- [ ] **Step 1: Başarısız testleri yaz.**
  `GoogleButton.test.tsx` (sahte `window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } }`; `afterEach` ile temizle):
  - `initializes Google with the client id and renders the button without loading the script when google is already present`: `initialize`'ın ilk argümanı `client_id: 'cid'` içerir, `renderButton` çağrılır, `document.getElementById('google-gsi')` yoktur.
  - `passes the credential to onCredential`: `initialize`'a verilen `callback`'i `{ credential: 'abc' }` ile çağır → `onCredential('abc')`.
  - `loads the Google script when it is missing and shows a message if it fails`: `window.google` yokken `#google-gsi` betiği `src="https://accounts.google.com/gsi/client"` ile eklenir; `error` olayı tetiklenince `Google ile giriş şu an yüklenemedi.` görünür.
  `Login.test.tsx`: mevcut üç teste `'GET /api/v1/auth/config': () => ({ body: { googleClientId: null } })` ekle. Yeni:
  - `shows no Google button and no divider when the server has no Client ID`: `veya demo hesapla` yazısı yok.
  - `shows the Google button and the divider when a Client ID is configured`: config `{ googleClientId: 'cid' }` + sahte `window.google`; `veya demo hesapla` görünür, e-posta/parola formu da durur.
  - `signs in with the Google credential and goes to the panel`: `initialize`'a verilen `callback` `{ credential: 'abc' }` ile çağrılır; `POST /api/v1/auth/google` gövdesi `{ credential: 'abc' }`; sonuç `Ayşe Yılmaz` panelde görünür.
  - `shows the backend message when Google sign-in fails` (401 `Google kimliği geçersiz ya da süresi dolmuş.`; form hâlâ kullanılabilir).
  - `still shows the form when the config request fails` (config isteği `network_error`; çökme yok, Google düğmesi yok).
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `cd frontend && npx vitest run src/auth src/pages/login` → FAIL.
- [ ] **Step 3: Uygula.** `api/auth.ts`'e iki fonksiyon; `AuthProvider`'a `loginWithGoogle` (`login` gibi `setState({ status: 'authenticated', user })`); `GoogleButton`; `Login.tsx`'te `useEffect` ile `fetchAuthConfig()` (hata → `null`), Client ID varsa formun üstünde `GoogleButton` + `<p className="login-divider">veya demo hesapla</p>`; Google geri çağrısı mevcut `inFlight`/`error` desenini kullanır (aynı `login-error` alanında). `Login.css`'e `.login-google` ve `.login-divider` (ince çizgili ayırıcı, `--muted`). Telefonda 360px'te taşmamalı.
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` (tip kontrolü dahil) hatasız.
- [ ] **Step 5: Commit (izinle).** `git add frontend/src/api/auth.ts frontend/src/auth frontend/src/pages/login`

---

### Task 7: Ön yüz: şerit ve günlük görünüm boş durumu

**Files:**
- Create: `frontend/src/pages/panel/TrialBanner.tsx`, `frontend/src/pages/panel/TrialBanner.css`
- Modify: `frontend/src/pages/panel/PanelLayout.tsx`, `PanelLayout.test.tsx`
- Modify: `frontend/src/pages/panel/daily/DailyPage.tsx`, `DailyPage.css`, `DailyPage.test.tsx`

**Interfaces:**
- Consumes: `CustomerForm` (`../customers/CustomerForm`, `{ customer?, onSaved, onCancel }`).
- Produces: `TrialBanner(): JSX.Element` (sabit metin `İki hafta ücretsiz dene`; sayaç yok, kapatılmaz). `PanelLayout` bunu en üste, `.panel` kapsayıcısının dışında tam genişlikte koyar. `DailyPage` `Dialog` birleşimine `{ kind: 'customer' }` ekler.

- [ ] **Step 1: Başarısız testleri yaz.**
  `PanelLayout.test.tsx`: `shows the trial banner above the panel on the daily and customers tabs`: `/panel` ve `/panel/musteriler` rotalarında `İki hafta ücretsiz dene` metni görünür (sayfa verisi stub'lanmaz; hata görünümü sorun değil).
  `DailyPage.test.tsx`: 
  - `the empty state offers "Müşteri ekle", which opens the customer form and can be cancelled`: gün boş; `Müşteri ekle` düğmesine tıklayınca `CustomerForm`'un bir alanı (alan etiketini `CustomerForm.tsx`/`CustomersPage.test.tsx`'ten al) görünür; iptalde kapanır.
  - `there is only one "Randevu ekle" button in the empty state` (`getAllByRole('button', { name: 'Randevu ekle' })` uzunluğu 1; mevcut başlıktaki düğme yeterli).
  - `the empty-state "Müşteri ekle" is not shown when the day has appointments`.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `npx vitest run src/pages/panel` → FAIL.
- [ ] **Step 3: Uygula.** `TrialBanner` + css (arka plan `var(--accent)`, yazı `var(--bg)`, alt kenarlık `var(--bw) solid var(--border)`, `var(--font-head)` kalın, ortalı, telefonda sığar). `PanelLayout` dönüşünü fragment yap: `<><TrialBanner /><div className="panel">…</div></>`. `DailyPage` boş durumu: `<div className="daily-empty"><p>Bu gün için randevu yok.</p><button type="button" className="cta" onClick={() => setDialog({ kind: 'customer' })}>Müşteri ekle</button></div>`; `dialog?.kind === 'customer'` iken `<CustomerForm onSaved={() => setDialog(null)} onCancel={() => setDialog(null)} />`. Not: Onaylanan taslakta boş kutuda iki düğme vardı; başlıkta zaten "Randevu ekle" durduğu ve aynı adlı iki düğme hem kafa karıştırır hem mevcut testleri bozar diye kutuya yalnızca "Müşteri ekle" konur.
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` hatasız.
- [ ] **Step 5: Commit (izinle).** `git add frontend/src/pages/panel`

---

### Task 8: Tanıtım sayfasından "Erken erişim"i kaldırma

**Files:**
- Modify: `frontend/src/pages/landing/Landing.tsx`
- Create: `frontend/src/pages/landing/Landing.test.tsx`
- Delete: `frontend/src/pages/landing/SignupForm.tsx`, `SignupForm.css`, `SignupForm.test.tsx`, `signup.ts`, `signup.test.ts`

**Interfaces:**
- Produces: `Landing()` — ana düğme `<Link className="cta" to="/giris">İki hafta ücretsiz dene</Link>`; `#erken-erisim` bölümü, `SignupForm` içe aktarması ve alt bilgideki "Erken erişim" bağlantısı yok; "Giriş" bağlantısı kalır.

- [ ] **Step 1: Başarısız testleri yaz** (`Landing.test.tsx`, `renderApp(<Landing />)`):
  - `the main button says "İki hafta ücretsiz dene" and goes to /giris`.
  - `no "erken erişim" text is left anywhere on the page` (`container.textContent` `/erken erişim/i` ile eşleşmez).
  - `there is no sign-up form`: e-posta alanı/`Kaydol` düğmesi yok.
  - `the footer keeps the "Giriş" link and the section links`.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `npx vitest run src/pages/landing/Landing.test.tsx` → FAIL.
- [ ] **Step 3: Uygula.** `Landing.tsx`'i düzenle; `signup`/`SignupForm` dosyalarını sil. `grep -rn "SignupForm\|signup\|FORM_ENDPOINT" frontend/src` kalıntı vermemeli. `Landing.css`'te yalnızca kaldırılan bölüme ait kullanılmayan sınıf varsa temizle.
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` hatasız.
- [ ] **Step 5: Commit (izinle).** `git add -A frontend/src/pages/landing`

---

### Task 9: Belgeler ve uçtan uca doğrulama

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: `CLAUDE.md`'yi güncelle.** (a) "Kurallar"daki "Kayıt formu … `FORM_ENDPOINT`" maddesini sil; yerine: giriş Google ile de yapılır, `GOOGLE_CLIENT_ID` (`backend/.env`) boşsa Google düğmesi görünmez, ön yüz Client ID'yi `GET /api/v1/auth/config`'ten alır. (b) Backend bölümüne: Google kullanıcıları `users.google_sub` ile tanınır, kullanıcı deposu tek kaynaktır (demo kullanıcılar da orada), yeni hata kodu `upstream_error` 502, `tokeninfo` küçük trafik için yeterli. (c) Ön yüz bölümüne: panelde sabit "İki hafta ücretsiz dene" şeridi; tanıtımda "Erken erişim" yok. `Proje Özeti`ndeki "tanıtım sayfası" tanımı doğruysa dokunma.
- [ ] **Step 2: Tüm testler ve derlemeler.** `cd backend && npm test && npm run build`; `cd ../frontend && npm test && npm run build` → hepsi hatasız (Postgres testleri `TEST_DATABASE_URL` yoksa atlanır; varsa PASS).
- [ ] **Step 3: Elle kontrol (Client ID yok).** `cd frontend && npm run build`; `cd ../backend && npm run dev`; `Ritma http://localhost:3000 adresinde çalışıyor` satırını bekle. Tarayıcıda: `/` ana düğme "İki hafta ücretsiz dene" → `/giris`; `/giris`'te Google düğmesi ve "veya demo hesapla" yok; `ayse@ritma.demo` / `demo-ayse-123` ile giriş çalışır; panelin üstünde şerit, "Bugün" boşken "Müşteri ekle" düğmesi form açar. Tarayıcıda `fetch('/api/v1/auth/google', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ credential: 'x' }) })` → 404 `not_found`.
- [ ] **Step 4: Elle kontrol (sahte Client ID).** Sunucuyu `GOOGLE_CLIENT_ID=deneme.apps.googleusercontent.com` ile yeniden başlat: `/giris`'te Google düğmesi alanı ve ayırıcı görünür (gerçek giriş denenmez; gerçek Client ID'yi kullanıcı sonra doldurur). Telefon genişliğinde (360px iframe, bkz. `CLAUDE.md` görsel kontrol notu) taşma olmadığını doğrula. İş bitince sunucuyu ve sekmeyi kapat.
- [ ] **Step 5: `git status`** ile `.env` ve gizli bilgi girmediğini, istenmeyen dosya olmadığını doğrula.
- [ ] **Step 6: Commit (izinle).** `git add CLAUDE.md` + varsa kalan dosyalar; sonra PR kullanıcıya bırakılır (PR açıklaması "Ne değişti?" / "Nasıl denedim?" başlıklı sade Türkçe).

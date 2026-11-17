# Ritma Doğal Dille Randevu Asistanı ve Randevu Öncesi Akıllı E-posta Bildirimi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcılar günlük görünümde (`/panel`) tek bir Türkçe cümleyle randevu taslağı (müşteri sistemde yoksa önce müşteri ekleme formu, ardından randevu formu dolu olarak) oluşturabilsin ve panelin altındaki (footer) bildirim ayarlarından yaklaşan randevular için geçmiş seans notlarının AI özetini içeren hatırlatma e-postalarını yönetip önizleyebilsin.

**Architecture:** `AiAssistant` arayüzü (`parseAppointmentPrompt` ve `summarizeCustomerHistory`) arkasında `GEMINI_API_KEY` tanımlıysa Google Gemini (`gemini-2.5-flash`) API'sine yerleşik `fetch` ile istek atan `GeminiAiAssistant`, anahtar yoksa veya Gemini hata/zaman aşımı verirse devreye giren kural tabanlı Türkçe `FallbackAiAssistant` çalışır. `ReminderService`, hatırlatma süresi (`15 | 30 | 60` dk) açık olan kullanıcıların bildirim penceresine girmiş ve henüz bildirimi gönderilmemiş (`reminderSentAt === null`) `scheduled` randevularını tarar; o müşterinin geçmiş randevu notlarından AI hazırlık özeti üretir, `EmailSender` ile konsola yazar, `ReminderNotificationRepository`'ye kaydeder ve randevunun `reminderSentAt` alanını günceller.

**Tech Stack:** Node.js + Express + TypeScript (node:test + tsx), PostgreSQL (`pg`), React + TypeScript + Vite + Vitest. Yeni npm bağımlılığı yok.

**Spec:** `docs/superpowers/specs/2026-11-12-ritma-ai-assistant-and-reminders-design.md` (uygulayıcılar planla birlikte onu da okur)

## Global Constraints

- Yeni npm kütüphanesi eklenmez. Gemini çağrıları `google-token-verifier.ts`'teki gibi Node'un yerleşik `fetch` ve `AbortSignal.timeout(8000)` mekanizmasıyla yapılır.
- Veritabanı değişikliği yeni numaralı dosyayla yapılır: `db/migrations/003_ai_and_reminders.sql` (`001_init.sql` ve `002_google_identity.sql` değiştirilmez).
- Yeni rotalar ve şemalar `api-contract/openapi.yaml` ve `frontend/src/api/types.ts` içine eklenir; `backend/src/contract.test.ts` ve `frontend/src/api/types.contract.test.ts` ile doğrulanır.
- Backend TDD ile yazılır: önce başarısız test, sonra kod. `npm test` (tsx) tipleri denetlemez; her görevin sonunda ayrıca `npm run build` çalıştırılır.
- Postgres testleri yalnızca `TEST_DATABASE_URL` varsa çalışır, yoksa atlanır; bellek ve Postgres depoları aynı davranış testlerini (`repositories/contract/`) paylaşır.
- Gerçek `GEMINI_API_KEY` ya da gizli bilgi depoya girmez. `backend/.env` okunamaz ve git'e girmez; yalnızca `backend/.env.example` düzenlenir.
- Stiller ayrı `.css` dosyalarında, `frontend/src/styles/tokens.css` değişkenleriyle (indigo vurgu, `--bw` kenarlık, sert gölge, monospace başlık). Telefon genişliğinde (360px) düzgün görünmeli.
- Çalışma düzeni: iş `feat/ai-assistant-and-reminders` branch'inde yapılır. **Commit adımları yalnızca kullanıcı izin verdiğinde uygulanır** (proje kuralı: "Sormadan commit atma"). `main`'e doğrudan commit yok.

## Review Focus

Spec'in ima ettiği ama düz akışta gözden kaçabilecek kritik durumlar (her satırın testi ilgili görevde):

1. Bir kullanıcının AI ayrıştırmasında veya e-posta özetinde başka bir kullanıcının müşterisi ya da randevu notları kesinlikle görünmemeli. → Görev 4, 5
2. AI cümleyi ayrıştırırken kullanıcı onayı olmadan doğrudan veritabanına müşteri veya randevu yazmamalı; yalnızca taslak döndürmeli. → Görev 3, 5
3. Aynı randevu için (randevu tarihi/saati değişmediği halde) birden fazla hatırlatma e-postası üretilmemeli (`reminderSentAt` kontrolü). → Görev 4
4. Randevunun tarihi/saati güncellenirse ya da durumu `scheduled` dışına çıkarsa `reminderSentAt` sıfırlanmalı (`null` olmalı) ki yeni saatte tekrar bildirim gidebilsin. → Görev 2, 4
5. `GEMINI_API_KEY` boşken veya Gemini 5xx / zaman aşımı döndüğünde uygulama çökmemeli, `FallbackAiAssistant` ile kesintisiz çalışmalı. → Görev 3, 5

---

### Task 1: `GEMINI_API_KEY`, `GEMINI_MODEL` yapılandırması ve alan tipleri (`domain/types.ts`)

**Files:**
- Modify: `backend/src/config.ts`, `backend/src/config.test.ts`
- Modify: `backend/.env.example`
- Modify: `backend/src/domain/types.ts`

**Interfaces:**
- Produces:
  ```ts
  // config.ts
  Config.geminiApiKey: string | undefined;
  Config.geminiModel: string; // varsayılan: 'gemini-2.5-flash'


  // domain/types.ts
  export type ReminderMinutes = 15 | 30 | 60;
  export const REMINDER_MINUTES_OPTIONS: readonly ReminderMinutes[] = [15, 30, 60];

  export interface AppointmentDraft {
    customerId: string | null;
    suggestedCustomer: { firstName: string; lastName: string } | null;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
  }

  export interface ReminderNotification {
    id: string;
    userId: string;
    appointmentId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    sentAt: string;
  }
  ```
  `Appointment` arayüzüne opsiyonel `reminderSentAt?: string | null` alanı eklenir (mevcut API yanıtlarını bozmamak için iç depoda tutulur ya da `null` varsayılır).

- [ ] **Step 1: `feat/ai-assistant-and-reminders` branch'ini aç.** `git switch -c feat/ai-assistant-and-reminders` (bekleyen `.claude/settings.json` değişikliğine dokunma).
- [ ] **Step 2: Başarısız testi yaz** (`config.test.ts`): `loadConfig` varsayılan testine `geminiApiKey: undefined` ekle; yeni test `GEMINI_API_KEY is read when set, trimmed, and empty counts as unset`.
- [ ] **Step 3: Çalıştır, düştüğünü gör.** `cd backend && node --import tsx --test src/config.test.ts` → FAIL.
- [ ] **Step 4: Uygula.** `config.ts` içine `geminiApiKey: env.GEMINI_API_KEY?.trim() || undefined` ekle. `domain/types.ts` içine `ReminderMinutes`, `REMINDER_MINUTES_OPTIONS`, `AppointmentDraft`, `ReminderNotification` tiplerini ve `Appointment.reminderSentAt?: string | null` alanını ekle. `backend/.env.example` dosyasına açıklamalı boş `GEMINI_API_KEY=` satırı ekle.
- [ ] **Step 5: Çalıştır.** `node --import tsx --test src/config.test.ts` → PASS; `npm run build` → hatasız.
- [ ] **Step 6: Commit (izinle).**

---

### Task 2: Veritabanı migration (`003_ai_and_reminders.sql`) ve depo katmanı güncellemeleri

**Files:**
- Create: `db/migrations/003_ai_and_reminders.sql`
- Modify: `backend/src/repositories/types.ts`
- Modify: `backend/src/repositories/contract/user-repository.contract.ts`, `backend/src/repositories/memory/user-repository.ts`, `backend/src/repositories/postgres/user-repository.ts`
- Modify: `backend/src/repositories/contract/appointment-repository.contract.ts`, `backend/src/repositories/memory/appointment-repository.ts`, `backend/src/repositories/postgres/appointment-repository.ts`
- Create: `backend/src/repositories/contract/reminder-notification-repository.contract.ts`
- Create: `backend/src/repositories/memory/reminder-notification-repository.ts`, `backend/src/repositories/memory/reminder-notification-repository.test.ts`
- Create: `backend/src/repositories/postgres/reminder-notification-repository.ts`, `backend/src/repositories/postgres/reminder-notification-repository.test.ts`
- Modify: `backend/src/services/appointment-service.ts`, `backend/src/services/appointment-service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // repositories/types.ts
  export interface UserWithSettings extends User {
    reminderMinutesBefore: ReminderMinutes | null;
  }

  // UserRepository ek metotları:
  getReminderSettings(userId: string): Promise<ReminderMinutes | null>;
  updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null>;
  listUsersWithRemindersEnabled(): Promise<UserWithSettings[]>;

  // AppointmentRepository ek metotları:
  listByCustomer(userId: string, customerId: string): Promise<Appointment[]>;
  markReminderSent(userId: string, id: string, sentAt: string): Promise<void>;

  export interface ReminderNotificationRepository {
    create(notification: ReminderNotification): Promise<ReminderNotification>;
    listByUser(userId: string, limit?: number): Promise<ReminderNotification[]>;
  }
  ```
  `AppointmentService.update`: eğer `date`, `startTime` değişirse veya `status !== 'scheduled'` olursa `reminderSentAt: null` olarak kaydedilir; aksi halde mevcut `reminderSentAt` korunur.

- [ ] **Step 1: Migration dosyasını oluştur** (`db/migrations/003_ai_and_reminders.sql`):
  - `ALTER TABLE users ADD COLUMN reminder_minutes_before integer DEFAULT 30 CHECK (reminder_minutes_before IN (15, 30, 60));`
  - `ALTER TABLE appointments ADD COLUMN reminder_sent_at timestamptz;`
  - `CREATE TABLE reminder_notifications (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE, appointment_id text NOT NULL REFERENCES appointments (id) ON DELETE CASCADE, recipient_email text NOT NULL, subject text NOT NULL, body text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now());`
  - `CREATE INDEX reminder_notifications_user_sent_idx ON reminder_notifications (user_id, sent_at DESC);`
- [ ] **Step 2: Ortak davranış testlerini yaz.**
  - `user-repository.contract.ts`: yeni kullanıcının varsayılan `getReminderSettings` değeri `30`'dur; `updateReminderSettings(id, 15)` ve `updateReminderSettings(id, null)` kaydedilir; `listUsersWithRemindersEnabled()` yalnızca `reminderMinutesBefore !== null` olan kullanıcıları döner.
  - `appointment-repository.contract.ts`: `listByCustomer` yalnızca o kullanıcı ve müşterinin randevularını tarih/saat sırasıyla döner; `markReminderSent` `reminderSentAt` alanını günceller.
  - `reminder-notification-repository.contract.ts`: `create` ve `listByUser` bildirimleri `sentAt` azalan sırada (en yeniden eskiye) ve yalnızca ilgili `userId` için döner.
  - `appointment-service.test.ts`: randevu saati veya tarihi güncellenince `reminderSentAt` sıfırlanır (`null`), sadece `note` güncellenince sıfırlanmaz.
- [ ] **Step 3: Çalıştır, düştüğünü gör.** `cd backend && node --import tsx --test src/repositories/memory/*.test.ts src/services/appointment-service.test.ts` → FAIL.
- [ ] **Step 4: Bellek ve Postgres depolarını + `AppointmentService` güncellemesini uygula.**
- [ ] **Step 5: Çalıştır.** `npm test` → PASS; `npm run build` → hatasız.
- [ ] **Step 6: Commit (izinle).**

---

### Task 3: AI Servisi (`FallbackAiAssistant` ve `GeminiAiAssistant`)

**Files:**
- Create: `backend/src/ai/ai-assistant.ts`
- Create: `backend/src/ai/fallback-ai-assistant.ts`, `backend/src/ai/fallback-ai-assistant.test.ts`
- Create: `backend/src/ai/gemini-ai-assistant.ts`, `backend/src/ai/gemini-ai-assistant.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface AiAssistant {
    parseAppointmentPrompt(input: {
      prompt: string;
      referenceDate: string;
      customers: Pick<Customer, 'id' | 'firstName' | 'lastName'>[];
    }): Promise<AppointmentDraft>;

    summarizeCustomerHistory(input: {
      customerName: string;
      upcomingAppointment: { date: string; startTime: string; note: string };
      pastAppointments: { date: string; status: AppointmentStatus; note: string }[];
    }): Promise<string>;
  }
  ```
  - `FallbackAiAssistant`:
    - Türkçe tarih ifadelerini (`bugün`, `yarın`, `öbür gün`, `YYYY-MM-DD`, `GG.AA.YYYY`) `referenceDate`'e göre çözer; bulamazsa `referenceDate` kullanır.
    - Saat ifadelerini (`14:00`, `14.00`, `14:00-15:00`, `14:00–15:00`, `saat 14`) ayrıştırır; bitiş saati yoksa başlangıçtan 1 saat sonrasını (`addHour`) verir; hiç saat yoksa `09:00`–`10:00` varsayar.
    - `customers` listesinde Türkçe karakter ve büyük/küçük harf duyarsız (`tr-TR`) ad-soyad arar; eşleşirse `customerId` doldurulur, `suggestedCustomer: null` olur. Eşleşmezse cümledeki ad-soyad adayını (`suggestedCustomer: { firstName, lastName }`) çıkarır. Kalan temiz metni `note` olarak yazar.
    - `summarizeCustomerHistory`: geçmiş randevu yoksa `"Bu müşteriyle daha önce kayıtlı seans bulunmuyor."`, varsa toplam seans sayısını ve son 3 randevunun tarih + notlarını Türkçe maddeler halinde özetler.
  - `GeminiAiAssistant`:
    - `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}` adresine `fetch` ile istek atar.
    - Herhangi bir ağ hatası, 4xx/5xx yanıtı, zaman aşımı veya geçersiz JSON durumunda sessizce `FallbackAiAssistant`'a düşer.

- [ ] **Step 1: Başarısız testleri yaz** (`fallback-ai-assistant.test.ts` ve `gemini-ai-assistant.test.ts`):
  - Fallback ile mevcut müşteri eşleşmesi (*"Yarın 14:00-15:00 Ali Veli kontrol randevusu"* → `customerId: 'c1'`, `date: '2026-11-18'`, `startTime: '14:00'`, `endTime: '15:00'`, `note: 'kontrol randevusu'`).
  - Fallback ile sistemde olmayan müşteri (*"Bugün saat 11 Zeynep Kaya ilk görüşme"* → `customerId: null`, `suggestedCustomer: { firstName: 'Zeynep', lastName: 'Kaya' }`, `startTime: '11:00'`, `endTime: '12:00'`).
  - Fallback ile geçmiş randevu özeti (geçmişi olan ve olmayan müşteri).
  - Gemini (`sahte fetch` ile): geçerli JSON yanıtını `AppointmentDraft`'a dönüştürür; Gemini 500 veya zaman aşımı verdiğinde `FallbackAiAssistant` sonucunu döndürür; API anahtarı hata mesajına sızmaz.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/ai/*.test.ts` → FAIL.
- [ ] **Step 3: Uygula.** `ai-assistant.ts`, `fallback-ai-assistant.ts`, `gemini-ai-assistant.ts`.
- [ ] **Step 4: Çalıştır.** `node --import tsx --test src/ai/*.test.ts` → PASS; `npm run build` → hatasız.
- [ ] **Step 5: Commit (izinle).**

---

### Task 4: Bildirim (`ReminderService`) ve E-posta Simülasyonu (`EmailSender`)

**Files:**
- Create: `backend/src/services/email-sender.ts`
- Create: `backend/src/services/reminder-service.ts`, `backend/src/services/reminder-service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // services/email-sender.ts
  export interface EmailMessage {
    to: string;
    subject: string;
    body: string;
  }
  export interface EmailSender {
    send(message: EmailMessage): Promise<void>;
  }
  export class ConsoleEmailSender implements EmailSender { ... }

  // services/reminder-service.ts
  export class ReminderService {
    constructor(
      private readonly users: UserRepository,
      private readonly appointments: AppointmentRepository,
      private readonly customers: CustomerRepository,
      private readonly notifications: ReminderNotificationRepository,
      private readonly ai: AiAssistant,
      private readonly emailSender: EmailSender,
      private readonly now: () => Date = () => new Date(),
    ) {}

    getSettings(userId: string): Promise<{ reminderMinutesBefore: ReminderMinutes | null }>;
    updateSettings(userId: string, reminderMinutesBefore: ReminderMinutes | null): Promise<{ reminderMinutesBefore: ReminderMinutes | null }>;
    listSent(userId: string): Promise<ReminderNotification[]>;
    checkUserReminders(userId: string): Promise<{ sentCount: number; notifications: ReminderNotification[] }>;
    checkAllUsers(): Promise<number>;
  }
  ```

- [ ] **Step 1: Başarısız testleri yaz** (`reminder-service.test.ts`):
  - Kullanıcının `reminderMinutesBefore` değeri `30` iken 20 dakika sonraki `scheduled` randevu için bildirim üretilir: alıcı `user.email`, konu müşteri adını ve saati içerir, gövde `ai.summarizeCustomerHistory` çıktısını içerir, `notifications` deposuna kaydedilir.
  - Aynı randevu için `checkUserReminders` ikinci kez çağrıldığında tekrar bildirim üretilmez (`sentCount: 0`).
  - Randevunun saati güncellenirse (`AppointmentService.update`) `reminderSentAt` sıfırlanır ve yeni saat penceresinde tekrar bildirim üretilir.
  - `reminderMinutesBefore === null` (Kapalı) iken bildirim üretilmez.
  - İptal edilmiş (`cancelled`), tamamlanmış (`completed`) veya başlangıç saati geçmiş randevular için bildirim üretilmez.
  - Bir kullanıcının müşteri geçmişi özetlenirken başka kullanıcının randevuları özete karışmaz.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/services/reminder-service.test.ts` → FAIL.
- [ ] **Step 3: Uygula.** `email-sender.ts` ve `reminder-service.ts`.
- [ ] **Step 4: Çalıştır.** `node --import tsx --test src/services/reminder-service.test.ts` → PASS; `npm run build` → hatasız.
- [ ] **Step 5: Commit (izinle).**

---

### Task 5: HTTP Rotaları, OpenAPI Sözleşmesi ve Sunucu Zamanlayıcısı

**Files:**
- Create: `backend/src/http/ai-routes.ts`, `backend/src/http/ai-routes.test.ts`
- Create: `backend/src/http/reminder-routes.ts`, `backend/src/http/reminder-routes.test.ts`
- Modify: `backend/src/app.ts`, `backend/src/deps.ts`, `backend/src/test-support.ts`, `backend/src/server.ts`
- Modify: `api-contract/openapi.yaml`, `backend/src/contract.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/ai/parse-appointment` (`{ prompt: string, referenceDate?: string }` → `200 AppointmentDraft`, boş `prompt` → `400 validation_error`)
  - `GET /api/v1/settings/reminders` → `200 { reminderMinutesBefore: 15 | 30 | 60 | null }`
  - `PATCH /api/v1/settings/reminders` (`{ reminderMinutesBefore: 15 | 30 | 60 | null }` → `200`, geçersiz değer → `400 validation_error`)
  - `POST /api/v1/reminders/check` → `200 { sentCount: number, notifications: ReminderNotification[] }`
  - `GET /api/v1/reminders/sent` → `200 ReminderNotification[]`
  - `server.ts`: 10 dakikada bir (`setInterval(..., 10 * 60 * 1000).unref()`) `deps.reminders.checkAllUsers()` çalıştırır.

- [ ] **Step 1: Başarısız HTTP ve sözleşme testlerini yaz** (`ai-routes.test.ts`, `reminder-routes.test.ts`, `contract.test.ts`):
  - `POST /api/v1/ai/parse-appointment`: oturumsuz `401`; boş `prompt` ile `400`; geçerli cümleyle `200 AppointmentDraft`; A kullanıcısının ayrıştırması B kullanıcısının müşterisini eşleştirmez; veritabanında müşteri/randevu oluşturmaz.
  - `GET` ve `PATCH /api/v1/settings/reminders`: varsayılan `30`, `15`/`60`/`null` olarak güncellenir, `45` veya `'abc'` ile `400 validation_error`.
  - `POST /api/v1/reminders/check` ve `GET /api/v1/reminders/sent`: yaklaşan randevu için bildirim üretir ve listeler; başka kullanıcının bildirimlerini göstermez.
  - `contract.test.ts`: 5 yeni rotayı alfabetik listeye ekle.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `node --import tsx --test src/http/ai-routes.test.ts src/http/reminder-routes.test.ts src/contract.test.ts` → FAIL.
- [ ] **Step 3: Rotaları, `app.ts`, `deps.ts`, `test-support.ts`, `server.ts` ve `api-contract/openapi.yaml` dosyalarını uygula.**
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` → hatasız.
- [ ] **Step 5: Commit (izinle).**

---

### Task 6: Ön Yüz API İstemcisi ve Sözleşme Testleri

**Files:**
- Modify: `frontend/src/api/types.ts`, `frontend/src/api/types.contract.test.ts`
- Create: `frontend/src/api/ai.ts`
- Create: `frontend/src/api/reminders.ts`

**Interfaces:**
- Produces:
  ```ts
  // api/types.ts
  export type ReminderMinutes = 15 | 30 | 60;
  export interface AppointmentDraft {
    customerId: string | null;
    suggestedCustomer: { firstName: string; lastName: string } | null;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
  }
  export interface ReminderSettings {
    reminderMinutesBefore: ReminderMinutes | null;
  }
  export interface ReminderNotification {
    id: string;
    userId: string;
    appointmentId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    sentAt: string;
  }

  // api/ai.ts
  export function parseAppointmentPrompt(prompt: string, referenceDate?: string): Promise<AppointmentDraft>;

  // api/reminders.ts
  export function getReminderSettings(): Promise<ReminderSettings>;
  export function updateReminderSettings(reminderMinutesBefore: ReminderMinutes | null): Promise<ReminderSettings>;
  export function checkRemindersNow(): Promise<{ sentCount: number; notifications: ReminderNotification[] }>;
  export function listSentReminders(): Promise<ReminderNotification[]>;
  ```

- [ ] **Step 1: `types.contract.test.ts` içine `AppointmentDraft`, `ReminderSettings` ve `ReminderNotification` şema anahtar kontrol testlerini ekle.**
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `cd frontend && npx vitest run src/api/types.contract.test.ts` → FAIL.
- [ ] **Step 3: `types.ts`, `ai.ts` ve `reminders.ts` dosyalarını uygula.**
- [ ] **Step 4: Çalıştır.** `npx vitest run src/api/types.contract.test.ts` → PASS.
- [ ] **Step 5: Commit (izinle).**

---

### Task 7: Ön Yüz: Günlük Görünümde Doğal Dil Randevu Asistanı ve Form Zinciri

**Files:**
- Modify: `frontend/src/pages/panel/customers/CustomerForm.tsx`
- Modify: `frontend/src/pages/panel/daily/AppointmentForm.tsx`
- Modify: `frontend/src/pages/panel/daily/DailyPage.tsx`, `DailyPage.css`, `DailyPage.test.tsx`

**Interfaces:**
- `CustomerFormProps`:
  - Opsiyonel `initialDraft?: { firstName: string; lastName: string }` ve `hint?: string` prop'ları eklenir.
  - `onSaved: (customer: Customer) => void` olarak güncellenir (`createCustomer` veya `updateCustomer`'ın döndürdüğü `Customer` nesnesini geçirir; mevcut `() => void` çağıranlarla geriye dönük uyumludur).
- `AppointmentFormProps`:
  - Opsiyonel `draft?: { customerId?: string; date?: string; startTime?: string; endTime?: string; note?: string }` prop'u eklenir; verildiğinde başlangıç state'lerini doldurur ve `endTime` doluysa `endEdited.current = true` yapar.
- `DailyPage`:
  - Gün başlığının altında doğal dil komut formu yer alır: `<input aria-label="Hızlı randevu komutu" placeholder="Örn: Yarın 14:00 Ali Veli kontrol randevusu" />` ve `<button type="submit">Oluştur</button>`.
  - Gönderildiğinde `parseAppointmentPrompt(prompt, date)` çağrılır:
    - `draft.customerId` varsa `AppointmentForm` bu taslakla açılır.
    - `draft.customerId === null` ve `draft.suggestedCustomer` varsa önce `CustomerForm` (`initialDraft={draft.suggestedCustomer}`, `hint="... kayıtlı değil. Önce müşteriyi ekleyin, ardından randevu formuna geçilecek."`) açılır; kullanıcı müşteriyi kaydettiğinde (`onSaved(newCustomer)`) doğrudan `AppointmentForm` (`customerId: newCustomer.id` ve taslaktaki tarih/saat/not ile) açılır.

- [ ] **Step 1: Başarısız testleri yaz** (`DailyPage.test.tsx`):
  - Kayıtlı müşteriyle doğal dil komutu girilip "Oluştur"a basılınca `POST /api/v1/ai/parse-appointment` çağrılır ve `AppointmentForm` müşteri, tarih, başlangıç/bitiş saati ve not dolu olarak açılır.
  - Kayıtsız müşteriyle komut girildiğinde önce Ad ve Soyad dolu `CustomerForm` ve bilgi mesajı açılır; müşteri kaydedilince otomatik olarak yeni müşterinin seçili olduğu `AppointmentForm`'a geçilir.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `cd frontend && npx vitest run src/pages/panel/daily/DailyPage.test.tsx` → FAIL.
- [ ] **Step 3: `CustomerForm.tsx`, `AppointmentForm.tsx`, `DailyPage.tsx` ve `DailyPage.css` dosyalarını uygula.**
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` → hatasız.
- [ ] **Step 5: Commit (izinle).**

---

### Task 8: Ön Yüz: Footer'da Bildirim Ayarları ve E-posta Önizleme Alanı

**Files:**
- Create: `frontend/src/pages/panel/ReminderFooter.tsx`, `frontend/src/pages/panel/ReminderFooter.css`
- Modify: `frontend/src/pages/panel/PanelLayout.tsx`, `frontend/src/pages/panel/PanelLayout.test.tsx`

**Interfaces:**
- Produces:
  - `ReminderFooter`: `footer.panel-footer` içinde:
    - Hatırlatma süresi `<select aria-label="Hatırlatma süresi">` (`Kapalı`, `15 dakika önce`, `30 dakika önce`, `60 dakika önce`) → değiştiğinde `PATCH /api/v1/settings/reminders` çağrılır.
    - `<button type="button">Şimdi kontrol et</button>` → `POST /api/v1/reminders/check` çağrılır, durumu gösterir ve gönderilen bildirim listesini günceller.
    - Gönderilen bildirimler listesi (`GET /api/v1/reminders/sent`): her bildirimin alıcısı (`recipientEmail`), konusu (`subject`) ve AI hazırlık özeti gövdesi (`body`) görüntülenir.

- [ ] **Step 1: Başarısız testleri yaz** (`PanelLayout.test.tsx`):
  - Footer'da hatırlatma süresi seçimi görünür ve değiştirildiğinde `PATCH /api/v1/settings/reminders` çağrılır.
  - "Şimdi kontrol et" düğmesine basıldığında `POST /api/v1/reminders/check` çağrılır ve dönen AI özetli e-posta bildirimi ekranda listelenir.
- [ ] **Step 2: Çalıştır, düştüğünü gör.** `cd frontend && npx vitest run src/pages/panel/PanelLayout.test.tsx` → FAIL.
- [ ] **Step 3: `ReminderFooter.tsx`, `ReminderFooter.css` ve `PanelLayout.tsx` dosyalarını uygula.** Mevcut testlerde `stubFetch` eşleşmeyen `/api/v1/settings/reminders` veya `/api/v1/reminders/sent` isteklerinde hata dönerse footer sessizce varsayılan durumda kalmalı (diğer sayfa testlerini kırmamalı).
- [ ] **Step 4: Çalıştır.** `npm test` → PASS; `npm run build` → hatasız.
- [ ] **Step 5: Commit (izinle).**

---

### Task 9: Belgeler ve Uçtan Uca Doğrulama

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-11-12-ritma-ai-assistant-and-reminders-design.md` (`Durum: onaylandı`)

- [ ] **Step 1: `CLAUDE.md` ve tasarım belgesini güncelle.** `CLAUDE.md` içine doğal dille randevu asistanı (`GEMINI_API_KEY` + yerel yedek ayrıştırıcı) ve randevu öncesi bildirim sistemi bilgilerini ekle.
- [ ] **Step 2: Tüm testler ve derlemeler.** `cd backend && npm test && npm run build`; `cd ../frontend && npm test && npm run build` → tümü PASS ve hatasız.
- [ ] **Step 3: `git status` kontrolü.** `.env` veya gizli anahtarların git'e girmediğini doğrula.
- [ ] **Step 4: Commit (izinle) ve PR hazırlığı.**

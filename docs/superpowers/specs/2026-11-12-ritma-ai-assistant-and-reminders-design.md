# Ritma: Doğal Dille Randevu Asistanı ve Randevu Öncesi Akıllı E-posta Bildirimi Tasarımı

Tarih: 2026-11-12. Durum: onay bekliyor.

Belgede "**Senin kararın**" diye işaretli maddeler kullanıcının söylediği şeylerdir. "**Benim kararım**" işaretliler, kullanıcıya sorulmadan verilmiş varsayılanlardır; okurken itiraz edilebilir.

## Amaç ve neden

Serbest çalışan uzmanlar (diyetisyen, koç, danışman, eğitmen) seans aralarında hızlıca yeni randevu girmek ve bir sonraki seansa girmeden önce o müşteriyle önceki görüşmelerde neler konuşulduğunu hatırlamak ister.

Bu tasarımla Ritma'ya iki tamamlayıcı AI özelliği eklenir:
1. **Doğal Dille Hızlı Randevu Asistanı:** Tek bir Türkçe cümleyle (*"Yarın 14:00–15:00 arası Ali Veli'ye kontrol randevusu yaz"*) randevu taslağı oluşturma ve onaylayarak kaydetme.
2. **Randevu Öncesi Akıllı E-posta Bildirimi:** Randevu saati yaklaşırken uzmana (`User.email`) gönderilen ve o müşteriyle yapılan geçmiş seans notlarının AI özetini içeren hazırlık e-postası.

## Hedefler

1. **Senin kararın:** Günlük görünümde (`/panel`) doğal dille randevu komutu yazılan bir giriş alanı bulunur. AI cümleyi ayrıştırır ve mevcut "Randevu ekle" penceresini (`AppointmentForm`) alanları dolu halde açar; kullanıcı kontrol edip **Kaydet**'e basar.
2. **Senin kararın:** Cümlede geçen müşteri sistemde kayıtlı değilse, önce ad ve soyad alanları dolu olarak "Müşteri ekle" penceresi (`CustomerForm`) açılır. Kullanıcı müşteriyi kaydettiği anda yeni müşterinin kimliğiyle dolu `AppointmentForm` penceresine otomatik geçilir.
3. **Senin kararın:** Randevu öncesi e-posta bildirimi yalnızca Ritma kullanıcısına (uzmana, `User.email`) gönderilir. İçeriğinde yaklaşan randevunun bilgileri ve o müşterinin geçmiş randevularındaki `note` kayıtlarından üretilen **AI Seans Öncesi Hazırlık Özeti** yer alır.
4. **Senin kararın:** Sayfanın altındaki **footer** (`PanelLayout`) üzerinde tüm bildirim ayarları ve önizleme yer alır:
   - Bildirim zamanı seçimi: `Kapalı`, `15 dk önce`, `30 dk önce`, `60 dk önce`.
   - Arka planda **10 dakikada bir** çalışan otomatik kontrolün yanı sıra, beklemeksizin denemek için **"Şimdi kontrol et"** düğmesi.
   - Simüle edilen e-postaların başlık, alıcı, zaman ve AI özet içeriğiyle listelendiği **"Gönderilen Bildirimler"** önizleme alanı.
5. **Senin kararın:** AI sağlayıcısı olarak Google Gemini API (`GEMINI_API_KEY`, `gemini-2.5-flash`) kullanılır; `GEMINI_API_KEY` boşsa yerel/kural tabanlı Türkçe ayrıştırıcı ve şablon özetleyici devreye girer (anahtarsız ortamda da kesintisiz çalışır).

## Hedef dışı (şimdilik yapılmayacak)

- **Senin kararın:** Müşteriye (`Customer`) e-posta gönderilmez; `customers` tablosuna e-posta alanı eklenmez.
- **Senin kararın:** Dış SMTP / Resend / Brevo gibi gerçek e-posta servisi entegrasyonu bu aşamada yapılmaz; e-postalar konsola ve panel altındaki önizleme listesine düşer (gerçek servis ileride `EmailSender` arayüzü arkasına eklenecek).
- Çok adımlı serbest sohbet (chat) penceresi, sesli komut veya randevu silme/iptal etme komutları yok; doğal dil çubuğu yalnızca randevu oluşturma taslağı üretir.
- Randevu saati geçtikten sonra geçmişe dönük hatırlatma e-postası gönderilmez.

## Yapılmaması gerekenler (başarısızlık sayılır)

- Bir kullanıcının AI ayrıştırmasında veya e-posta özetinde başka bir kullanıcının müşterisi ya da randevu notları görünüyorsa.
- AI cümleyi ayrıştırırken kullanıcı onayı olmadan doğrudan veritabanına müşteri veya randevu yazıyorsa.
- Aynı randevu için (randevu tarihi/saati değişmediği halde) birden fazla hatırlatma e-postası üretiliyorsa.
- `GEMINI_API_KEY` boşken uygulama çöküyor veya özellik tamamen kullanılamaz hale geliyorsa.
- Gerçek `GEMINI_API_KEY` depoya (`git`) girdiyse.

## Kısıtlar

- Proje kuralları (`CLAUDE.md`): yeni npm kütüphanesi eklenmez. Ön yüz bağımlılık listesi sabittir. Gemini çağrıları `google-token-verifier.ts` örneğindeki gibi Node'un yerleşik `fetch` fonksiyonuyla yapılır.
- Yeni veritabanı değişikliği yeni numaralı `.sql` dosyasıyla (`db/migrations/003_ai_and_reminders.sql`) yapılır, eski dosyalar değiştirilmez.
- Yeni rotalar ve şemalar `api-contract/openapi.yaml` ve `frontend/src/api/types.ts` içine eklenir (`contract.test.ts` ve `types.contract.test.ts` ile doğrulanır).
- Backend TDD ile geliştirilir; bellek ve Postgres depoları aynı davranış testlerini (`repositories/contract/`) paylaşır.

## Kullanıcının göreceği davranış

**Doğal dille randevu ekleme (`/panel`).**
Günlük görünümde tarih başlığının üstünde/altında kısa bir komut çubuğu yer alır: örnek yer tutucu *"Örn: Yarın 14:00 Ali Veli kontrol randevusu"* ve yanında **"Oluştur"** düğmesi.
- Kullanıcı metni yazıp gönderdiğinde `POST /api/v1/ai/parse-appointment` çağrılır.
- Müşteri mevcut aktif müşterilerden biriyle eşleşirse `AppointmentForm` penceresi müşteri seçili, tarih, başlangıç/bitiş saati ve not alanları dolu olarak açılır. Kullanıcı isterse düzeltir, **Kaydet**'e basınca randevu oluşur.
- Müşteri eşleşmez ama cümleden ad-soyad çıkarıldıysa (ör. *"Zeynep Kaya"*), önce `CustomerForm` penceresi Ad ve Soyad dolu olarak açılır (üstünde kısa bilgi metni: *"Zeynep Kaya kayıtlı değil. Önce müşteriyi ekleyin, ardından randevu formuna geçilecek."* — **benim kararım**). Kullanıcı doğum tarihi/cinsiyet seçip **Kaydet**'e bastığında pencere kapanmadan doğrudan yeni müşterinin seçili olduğu dolu `AppointmentForm`'a geçer.
- Cümlede tarih belirtilmemişse ekranda seçili olan gün (`date`), bitiş saati belirtilmemişse başlangıçtan 1 saat sonrası (`addHour(startTime)`) varsayılır (**benim kararım**).

**Footer üzerinde bildirim ayarları ve önizleme (`PanelLayout`).**
Panelin en altında (`footer.panel-footer`) tüm panel sekmelerinde görünen bir alan yer alır:
- **Hatırlatma Süresi Seçimi:** `Kapalı`, `15 dakika önce`, `30 dakika önce`, `60 dakika önce` seçenekli seçim kutusu (`select`). Değiştirildiğinde `PATCH /api/v1/settings/reminders` ile kaydedilir.
- **"Şimdi kontrol et" Düğmesi:** `POST /api/v1/reminders/check` isteği atar; o anki zamana göre bildirim penceresine girmiş randevuları tarar, yeni üretilen bildirim sayısını gösterir ve listeyi günceller.
- **Gönderilen Bildirimler Listesi:** Üretilen simülasyon e-postalarını en yeniden eskiye doğru gösterir (Kime, Konu, Gönderim zamanı, Randevu saati ve **AI Seans Öncesi Hazırlık Özeti** metni).

## Teknik yaklaşım (ayrıntılar **benim kararım**, uygulayıcı gerekirse iyileştirebilir)

**1. AI Servisi (`backend/src/ai/`).**
- `AiAssistant` arayüzü iki metot sunar:
  - `parseAppointmentPrompt(input: { prompt: string; referenceDate: string; customers: Pick<Customer, 'id' | 'firstName' | 'lastName'>[] }): Promise<AppointmentDraft>`
  - `summarizeCustomerHistory(input: { customerName: string; upcomingAppointment: { date: string; startTime: string; note: string }; pastAppointments: { date: string; status: AppointmentStatus; note: string }[] }): Promise<string>`
- **Gemini gerçeklemesi (`GeminiAiAssistant`):** `GEMINI_API_KEY` tanımlıysa `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` adresine `fetch` ve `AbortSignal.timeout(8000)` ile istek atar. `parseAppointmentPrompt` için JSON şema çıktısı (`responseMimeType: 'application/json'`) ister. Gemini hata verir veya zaman aşımına uğrarsa yerel yedek gerçeklemeye (`FallbackAiAssistant`) düşer (**benim kararım**: böylece geçici ağ/kota sorunlarında da kullanıcı akışı kesilmez).
- **Yerel yedek gerçekleme (`FallbackAiAssistant`):**
  - Türkçe tarih ifadelerini (*"bugün"*, *"yarın"*, *"öbür gün"*, `YYYY-MM-DD`, `GG.AA.YYYY`), saat ifadelerini (`14:00`, `14.00`, `14:00-15:00`, `saat 14`) ayrıştırır.
  - Mevcut müşteri listesinde ad-soyad eşleşmesi (büyük/küçük harf ve Türkçe karakter duyarsız) arar; bulamazsa cümledeki büyük harfle başlayan iki kelimelik ad-soyad adayını `suggestedCustomer` olarak çıkarır, kalan kısmı `note` alanına yazar.
  - E-posta özetinde müşterinin geçmiş randevu sayısını ve son 3 randevusunun tarih + notlarını maddeler halinde Türkçe özetler.

**2. Bildirim ve Zamanlayıcı Servisi (`backend/src/services/reminder-service.ts`).**
- Hangi randevulara bildirim gideceği kuralı (**benim kararım**):
  - Kullanıcının `reminderMinutesBefore` değeri `null` değilse (15, 30 veya 60),
  - Randevunun durumu `scheduled` ise ve `reminderSentAt === null` ise,
  - Randevunun başlangıç zamanı (`date + startTime`), şu anki zaman (`now`) ile `now + reminderMinutesBefore` dakika aralığındaysa (`now <= appointmentStart <= now + reminderMinutesBefore * 60_000`),
  - O müşterinin geçmiş randevuları çekilir, `AiAssistant.summarizeCustomerHistory` ile hazırlık özeti üretilir, `EmailSender.send` ile konsola basılır ve bildirim deposuna (`ReminderNotification`) kaydedilir; randevunun `reminderSentAt` alanı güncellenir.
- Randevu güncellendiğinde (`AppointmentService.update`) eğer `date` veya `startTime` değişirse ya da durum `scheduled` dışına çıkarsa `reminderSentAt` sıfırlanır (`null` yapılır) (**benim kararım**).
- Sunucu başlangıcında (`server.ts`) `setInterval(..., 10 * 60 * 1000)` ile 10 dakikada bir tüm aktif hatırlatma ayarı olan kullanıcılar için kontrol çalıştırılır (`.unref()` ile test/kapanış sürecini bloklamaz).

## Şema ve API sözleşmesi

### Veritabanı (`db/migrations/003_ai_and_reminders.sql`)

1. `users` tablosuna ek sütun:
   - `reminder_minutes_before integer CHECK (reminder_minutes_before IN (15, 30, 60)) DEFAULT 30` (`NULL` = bildirim kapalı; varsayılan `30` — **benim kararım**).
2. `appointments` tablosuna ek sütun:
   - `reminder_sent_at timestamptz` (`NULL` = henüz gönderilmedi).
3. Gönderilen (simüle edilen) e-posta bildirimlerini kalıcı tutmak için `reminder_notifications` tablosu (**benim kararım**):
   - `id text PRIMARY KEY`
   - `user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE`
   - `appointment_id text NOT NULL REFERENCES appointments (id) ON DELETE CASCADE`
   - `recipient_email text NOT NULL`
   - `subject text NOT NULL`
   - `body text NOT NULL`
   - `sent_at timestamptz NOT NULL DEFAULT now()`

### Yeni API Uç Noktaları (`api-contract/openapi.yaml`)

1. `POST /api/v1/ai/parse-appointment`
   - İstek: `{ "prompt": string, "referenceDate"?: string }` (`prompt` boşsa `400 validation_error`).
   - Yanıt (`200`):
     ```json
     {
       "customerId": "c1",
       "suggestedCustomer": null,
       "date": "2026-11-13",
       "startTime": "14:00",
       "endTime": "15:00",
       "note": "Kontrol randevusu"
     }
     ```
     (Müşteri bulunamadıysa `customerId: null` ve `suggestedCustomer: { "firstName": "Zeynep", "lastName": "Kaya" }`).
2. `GET /api/v1/settings/reminders`
   - Yanıt (`200`): `{ "reminderMinutesBefore": 15 | 30 | 60 | null }`
3. `PATCH /api/v1/settings/reminders`
   - İstek: `{ "reminderMinutesBefore": 15 | 30 | 60 | null }` (geçersiz değerde `400 validation_error`).
   - Yanıt (`200`): `{ "reminderMinutesBefore": 15 | 30 | 60 | null }`
4. `POST /api/v1/reminders/check`
   - Kullanıcının yaklaşan randevularını o an kontrol eder, süresi gelenler için AI özetli e-posta bildirimi üretir.
   - Yanıt (`200`): `{ "sentCount": number, "notifications": ReminderNotification[] }`
5. `GET /api/v1/reminders/sent`
   - Kullanıcının simüle edilen son bildirim e-postalarını döner.
   - Yanıt (`200`): `ReminderNotification[]`

## Uygulayıcıya bırakılanlar

- Dosya ve sınıf adları, iç modül bölünmesi (`backend/src/ai/`, `backend/src/services/reminder-service.ts` vb.).
- Günlük görünümdeki AI komut çubuğunun ve footer'daki bildirim önizleme kutusunun tam CSS yerleşimi (mevcut "keskin ve teknik" tasarım diline uygun: 2px kenarlık, sert gölge, monospace başlıklar, `tokens.css` değişkenleri).
- `CustomerForm` ve `AppointmentForm` bileşenlerine eklenecek `draft` prop'larının iç detayları ve `CustomerForm`'daki `onSaved(customer: Customer)` imzası.
- Gemini sistem komutunun (prompt) tam metni ve yerel ayrıştırıcının düzenli ifadeleri (regex).

## Açık noktalar

- `backend/.env` içine gerçek `GEMINI_API_KEY` değerini eklemek kullanıcıya aittir; `.env.example` dosyasına açıklamasıyla boş olarak eklenecektir.
- İleride gerçek e-posta gönderimine (SMTP, Resend veya Brevo) geçilmek istendiğinde yalnızca `EmailSender` arayüzünün yeni bir gerçeklemesi yazılıp `deps.ts` içine bağlanacaktır.

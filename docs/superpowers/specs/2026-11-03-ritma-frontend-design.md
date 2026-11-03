# Ritma Ön Yüz Tasarımı

Tarih: 2026-11-03

## Amaç

Ritma'nın tüm kullanıcı arayüzünü (tanıtım sayfası dahil) tek bir ön yüz projesinden sunmak ve backend'in `/api/v1` uçlarını kullanan bir yönetim paneli kurmak.

Hizmet sağlayıcı (danışman, koç, eğitmen, diyetisyen vb.) giriş yapar, o günün randevularını görür, sekmelerle müşteri listesine, haftalık ve aylık takvime geçer; müşteri ve randevu ekler, düzenler, siler. Saat çakışmasında uyarı alır.

Başarı ölçütü: Backend tasarım belgesindeki akışın (giriş → günlük randevular → sekmeler) tarayıcıda baştan sona çalışması; telefonda da düzgün görünmesi; mevcut tanıtım sayfasının görünüm ve kayıt formu davranışının aynen korunması.

## Kararlar

- **Teknoloji:** React + TypeScript + Vite. Gerekçe: panelde dört görünüm, formlar, çakışma yönetimi ve oturum durumu var; bileşenler ve tip güvenliği bunu sürdürülebilir tutar. Backend zaten TypeScript.
- **Kapsam:** Tanıtım sayfası ve panel tek ön yüz uygulamasıdır. Backend yalnızca API'dir.
- **Sunum:** Express, derlenmiş `frontend/dist`'i servis eder (tek origin, CORS yok, `HttpOnly` + `SameSite=Lax` çerez olduğu gibi çalışır). Bu, backend tasarım belgesindeki "panel aynı sunucudan servis edilir" kararının devamıdır.
- **Stil:** Düz CSS, HTML ve JSX'in dışında ayrı `.css` dosyalarında. Tailwind kullanılmaz.
- **Dil:** Arayüz metinleri Türkçe. Dosya ve klasör adları İngilizce.

## Mimari

```
Tarayıcı ──► Express (3000) ──► /api/v1/*   → API (değişmez)
                          ├──► /docs      → Swagger (yalnızca geliştirmede)
                          └──► diğer GET  → frontend/dist
Geliştirme: Vite (5173) → /api ve /docs isteklerini 3000'e yönlendirir (proxy)
```

### Proje yapısı

`frontend/` ayrı bir `package.json` ile bağımsızdır (workspace yok), backend gibi.

```
frontend/
  index.html, vite.config.ts, tsconfig.json
  src/
    main.tsx, App.tsx          rota tanımları
    styles/                    tokens.css (:root değişkenleri), base.css
    api/                       client.ts, types.ts, auth.ts, customers.ts, appointments.ts
    auth/                      AuthProvider, RequireAuth
    pages/                     landing/, login/, panel/ (günlük, haftalık, aylık, müşteriler)
    components/                düğme, form alanı, modal, sekmeler
    lib/                       date.ts, labels.ts
```

### Stil organizasyonu

- `styles/tokens.css`: `web/index.html` içindeki `:root` değişkenleri ("keskin ve teknik": indigo vurgu, 2px kenarlık, sert gölge, monospace başlıklar). Renkler yalnızca buradan gelir.
- `styles/base.css`: sıfırlama ve tipografi.
- Her sayfa/bileşen yanında kendi `.css` dosyasını taşır ve `import './X.css'` ile alır (örn. `WeeklyView.tsx` + `WeeklyView.css`). Sınıf adlarına bileşene özgü önek verilir (`.weekly-…`). HTML içinde `<style>` ya da `style=""` kullanılmaz. Çakışma sorunu çıkarsa CSS Modules'a geçilebilir (Vite hazır destekler).
- Panel telefon ekranında da düzgün görünür.

### Rotalar

| Rota | Sayfa |
|---|---|
| `/` | Tanıtım sayfası |
| `/giris` | Giriş |
| `/panel` | Günlük görünüm |
| `/panel/hafta` | Haftalık görünüm |
| `/panel/ay` | Aylık görünüm |
| `/panel/musteriler` | Müşteriler |

`/panel/*` oturum yoksa `/giris`'e yönlendirir.

### Backend'de değişenler

- `server.ts`: `staticDir` artık `frontend/dist`.
- `app.ts`: `/api` ve `/docs` dışındaki GET isteklerine `index.html` döndüren yedek rota (SPA fallback). `/panel/hafta` adresine doğrudan gidince 404 çıkmaz. Testle doğrulanır.
- `web/` klasörü, tanıtım sayfası taşınıp görünüm eşitliği doğrulandıktan sonra silinir.

### Bağımlılıklar

Çalışma: `react`, `react-dom`, `react-router`. Geliştirme: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`. Bu liste dışında kütüphane eklemek için önce kullanıcıya sorulur.

Bilerek eklenmeyenler: Tailwind, UI kiti, veri çekme kütüphanesi (TanStack Query vb.), takvim kütüphanesi, Playwright. Gerekirse sonra değerlendirilir.

## Oturum

- Uygulama açılırken `GET /api/v1/auth/me` çağrılır; `AuthProvider` kullanıcıyı tutar, `RequireAuth` panel rotalarını korur.
- Oturum çerezle taşınır (`ritma_session`, `HttpOnly`); jeton `localStorage`'da saklanmaz. Çıkış `POST /api/v1/auth/logout`.
- Herhangi bir istek 401 dönerse oturum durumu temizlenir ve `/giris`'e yönlendirilir.

## API istemcisi ve veri akışı

- Tek bir `request()` fonksiyonu 204'ü ve JSON'u çözer; hata olunca `ApiError { status, code, message }` fırlatır. Backend mesajları Türkçe olduğundan doğrudan gösterilir. Sunucuya hiç ulaşılamazsa "Sunucuya ulaşılamadı." gösterilir.
- Küçük bir `useApi` kancası `{ data, loading, error, reload }` döndürür. Kaydetme/silme sonrası ilgili liste yeniden yüklenir.
- `api/types.ts` elle yazılır; alan adlarının `api-contract/openapi.yaml` ile uyumu bir testle denetlenir.
- Randevu yanıtı müşteri adını kendisi taşır (`customer: { id, firstName, lastName }`, müşteri silinmiş olsa bile dolu gelir); randevu satırlarında ad doğrudan buradan gösterilir. Müşteri listesi yalnızca randevu formundaki müşteri seçimi için yüklenir.

## Ekranlar

| Ekran | İçerik |
|---|---|
| Günlük (`/panel`) | Tarih gezgini (önceki/sonraki/bugün); o günün randevuları saat sırasıyla (saat, müşteri adı, durum, not). Randevu ekle, düzenle, iptal et, sil. |
| Haftalık | Pazartesi–Pazar sütunları, her gün kendi randevularıyla. Güne tıklayınca günlük görünüm. |
| Aylık | Ay ızgarası, günlerde randevu sayısı. Güne tıklayınca günlük görünüm. |
| Müşteriler | Liste + ada göre arama (yazarken gecikmeli, `?search=`); müşteri ekle, düzenle, sil. |

Hafta Pazartesi'den başlar. Üç takvim görünümü aynı `GET /appointments?from=&to=` ucunu kullanır.

### Formlar

- Randevu ve müşteri formları sayfa içi modaldır. Tarayıcının `alert/confirm` kutuları kullanılmaz; silme onayı da sayfa içi modaldır.
- Sunucu 400 ya da 409 dönerse mesaj formda gösterilir, modal açık kalır, girilen veri korunur.
- Randevu formu: müşteri seçimi, tarih, başlangıç, bitiş, durum, not. Müşteri formu: ad, soyad, doğum tarihi, cinsiyet.

### Etiketler (API kodu → ekran metni)

- Cinsiyet: `female` Kadın, `male` Erkek, `other` Diğer, `undisclosed` Belirtmek istemiyorum.
- Durum: `scheduled` Planlandı, `completed` Tamamlandı, `cancelled` İptal.

### Her ekranda üç durum

Yükleniyor, boş ("Bu gün için randevu yok" gibi) ve hata ("Yeniden dene" düğmesiyle).

### Dikkat edilecek noktalar

- **Silinmiş müşteri:** Müşteri silinince listeden kalkar, randevusu kalır; randevu yanıtı `customer` alanını yine doldurur, satırda ad olduğu gibi görünür. Silinmiş müşterinin randevusu düzenlenirken müşteri seçim kutusu mevcut müşteriyi "(silinmiş)" ekiyle ayrıca listeler.
- **Tarih hatası riski:** Tarihler `YYYY-MM-DD` metni olarak taşınır ve yerel saatle işlenir. `toISOString()` kullanılmaz (Türkiye saatinde günü bir geri kaydırabilir). Bunun için `lib/date.ts` ve testi vardır.

## Kullanıcı akışı

1. **İlk karşılaşma:** Ziyaretçi tanıtım sayfasını görür; ilgisini kayıt formuyla bırakır ya da **Giriş** bağlantısına tıklar.
2. **Giriş:** E-posta ve parola girilir. Yanlışsa formun altında backend mesajı görünür, e-posta silinmez. Doğruysa bugünün randevu ekranı açılır.
3. **Günlük iş:** Bugünün randevuları görünür. Oklarla gün değişir. **Randevu ekle** penceresinde müşteri, tarih, saatler, not girilip kaydedilir. Çakışmada pencere kapanmaz, uyarı çıkar. Randevu düzenlenebilir, iptal edilebilir, silinebilir (silmeden önce onay).
4. **Hafta ve ay:** Sekmelerden Hafta ya da Ay seçilir; güne tıklayınca günlük görünüme dönülür.
5. **Müşteriler:** Liste, arama, ekleme, düzenleme, silme. Geçersiz bilgi (örn. gelecek doğum tarihi) açıklamasıyla uyarılır.
6. **Çıkış:** Sağ üstten çıkış yapılır; oturum geçersiz kılınır.

## Tanıtım sayfası

`web/index.html` içindeki sayfa React bileşenlerine bire bir taşınır. `validateSignup` / `sendSignup` mantığı aynı davranışla `pages/landing/signup.ts`'e taşınır. `FORM_ENDPOINT` sabiti boşken form hata gösterir (kayıt kaybolmasın diye başarı göstermez); bu davranış korunur ve testlenir. Form servisi hâlâ seçilmedi; yayından önce adres yazılmalıdır. Harici servis eklemek için önce sorulur.

## Test stratejisi

Ön yüz TDD ile geliştirilir (Vitest + Testing Library + jsdom).

| Katman | Ne test edilir | Nasıl |
|---|---|---|
| Saf mantık | `date.ts` (hafta başı, ay ızgarası, gün kayması), etiketler, `validateSignup` | Doğrudan fonksiyon testi |
| API istemcisi | 204/JSON çözme, `ApiError`, 401 yönlendirmesi, ağ hatası | `fetch` ağ sınırında taklit edilir |
| Bileşen/sayfa | Giriş, müşteri formu, randevu formu ve 409 uyarısı, boş/yükleniyor/hata durumları, `RequireAuth` | Kullanıcının gördüğü metin ve etkileşimle |
| Sözleşme uyumu | `types.ts` alan adları `openapi.yaml` ile uyumlu | Küçük bir test |
| Gerçek uçtan uca | Tarayıcıda gerçek backend ile akış | Her adımın sonunda Chrome ile doğrulama |

Backend'deki "mock yok" kuralı ön yüz için geçerli değildir; ön yüz testlerinde `fetch` taklit edilir. Bu nedenle gerçek davranış tarayıcı doğrulamasıyla teyit edilir. Her adımda `npm test` ve `npm run build` (tip kontrolü dahil) geçmelidir. Backend değişiklikleri (yedek rota) backend'in kendi kurallarıyla, `startTestServer()` ile test edilir.

## Taşıma sırası

Her adım çalışan bir uygulama bırakır ve ayrı bir `feat/...` dalında PR ile `main`'e girer.

1. **İskelet ve sunum:** `frontend/` kurulumu, `tokens.css`, Vite proxy; backend `frontend/dist`'i servis eder, yedek rota eklenir.
2. **Tanıtım sayfası taşınır:** `/` rotası, kayıt formu davranışıyla. Görünüm eşitliği ekran görüntüsüyle doğrulanır, ardından `web/` silinir.
3. **API istemcisi + oturum + giriş:** `/giris`, `AuthProvider`, `RequireAuth`, panel iskeleti, çıkış.
4. **Müşteriler ekranı.**
5. **Günlük görünüm + randevu formu** (çakışma uyarısı dahil).
6. **Haftalık ve aylık görünümler.**

Tanıtım sayfası erken taşınır; böylece `/` adresini ön yüz devralır ve `web/` hemen kalkar, iki ayrı sunum şekli birlikte yaşamaz.

## Geliştirme düzeni

İki terminal: backend `npm run dev` (3000), ön yüz `npm run dev` (5173). Geliştirirken `http://localhost:5173` açılır; Vite `/api` ve `/docs` isteklerini 3000'e yönlendirdiği için çerez aynı origin'de sorunsuz çalışır. Yayın benzeri deneme için ön yüz derlenir ve `http://localhost:3000` açılır.

## CLAUDE.md'de güncellenecekler

- Proje özeti ve Teknoloji: ön yüz React + TS + Vite, `web/` yok.
- "Ön yüzde framework yok" kuralı, bu belgedeki bağımlılık listesiyle değişir; listedışı kütüphane için yine sorulur.
- Komutlar: ön yüz `npm run dev/test/build`; başsız Chrome notu yeni yapıya uyarlanır.
- Backend: statik servis `frontend/dist`, yedek rota.
- Kurallar: stiller ayrı `.css` dosyalarında, dosya adları İngilizce.

## Kapsam dışı

- Tanıtım sayfası ön yüz uygulaması olduğu için arama motoru ve bağlantı önizlemeleri statik HTML kadar iyi olmayabilir. Gerekirse sonra önceden üretme (prerender) eklenir.
- Mobil uygulama, sayfalama, Google girişi, canlıya alma altyapısı, `FORM_ENDPOINT` için form servisi seçimi.
- Otomatik uçtan uca test aracı (Playwright).

## Riskler

- Tanıtım sayfasının görünümünü bire bir korumak: ekran görüntüsü karşılaştırmasıyla doğrulanır.
- Vite (5173) ve Express (3000) farklı portta çalışır: çerez ve `/api` yönlendirmesi proxy ile çözülür ve 1. adımda doğrulanır.
- Silinmiş müşterinin randevusunu düzenleme: seçim kutusu mevcut müşteriyi "(silinmiş)" ekiyle gösterir.
- Tarih kayması: `toISOString()` yasağı ve `date.ts` testleriyle ele alınır.

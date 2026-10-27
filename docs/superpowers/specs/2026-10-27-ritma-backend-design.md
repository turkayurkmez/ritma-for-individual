# Ritma Backend Tasarımı

Tarih: 2026-10-27

## Amaç ve neden

Ritma, serbest çalışan hizmet sağlayıcılar (danışman, koç, eğitmen, diyetisyen vb.) için bir randevu ve müşteri takip sistemi olarak planlanıyor. Şu an elimizde yalnızca bir tanıtım sayfası var (`index.html`). Bu iş, ürünün kendisinin ilk çalışan backend'ini kurar: hizmet sağlayıcı giriş yapar, o günün randevularını görür, müşterilerini ve takvimini yönetir.

Backend'in ilk işi erken erişim kayıtlarını toplamak **değildir**. İlk işi randevu ve müşteri takibidir.

## Hedefler

- Hizmet sağlayıcı giriş yapar ve yalnızca kendi verilerini görür.
- Gün, hafta ve ay için randevuları listeler.
- Müşteri arar, yeni müşteri ekler, müşteri listesini görür.
- Takvimden tarih ve başlangıç/bitiş saati seçerek randevu oluşturur, düzenler, siler, iptal eder.
- Aynı hizmet sağlayıcının çakışan randevusu sistem tarafından engellenir.
- Veri tabanına ve Google ile girişe sonradan, mevcut katmanları bozmadan geçilebilir.

## Hedef olmayanlar (ilk sürüm)

- Kalıcı veri tabanı. Veriler bellekte durur, sunucu yeniden başlayınca silinir.
- Kullanıcı kaydı (hesap açma) ekranı.
- Google ile giriş. Yalnızca buna geçişin kolay olması istenir.
- Erken erişim formunun backend'i.
- Çok kullanıcılı ekip/çalışan yapısı. Her hesap tek bir hizmet sağlayıcıdır.
- Bildirim, e-posta, SMS, ödeme.

## Anti-hedefler

- Bir hizmet sağlayıcının başkasının müşterisini ya da randevusunu görebilmesi ya da değiştirebilmesi.
- Çakışan iki aktif randevunun kaydedilebilmesi.
- Giriş yönteminin (demo hesap) oturum, kullanıcı ve veri katmanına sızması. Google'a geçiş yalnızca yeni bir sağlayıcı eklemek olmalı.

## Kullanıcı akışı

1. Kullanıcı giriş yapar.
2. Yönetim panelinde o günün randevularını görür.
3. Ekrandaki sekmelerle müşteri listesine, haftalık takvime ya da aylık takvime geçer.
4. Arama çubuğundan kayıtlı müşterisini arar ya da yeni müşteri ekler (ad, soyad, doğum tarihi, cinsiyet).
5. Takvimden tarih ve başlangıç/bitiş saati seçip müşteriyle ilişkilendirerek randevu oluşturur. İsterse serbest not yazar.

Arayüz bu belgenin kapsamı dışındadır; yalnızca backend tasarlanır. Panel arayüzü ayrı bir iştir.

## Veri modeli

**Kullanıcı (hizmet sağlayıcı):** kimlik (id), e-posta, görünen ad. İlk sürümde birkaç hazır demo kullanıcı vardır.

**Müşteri:** id, sahibi olan kullanıcının id'si, ad, soyad, doğum tarihi (zorunlu), cinsiyet, silinme zamanı (boşsa müşteri aktiftir).

- Cinsiyet sabit bir listeden seçilir: `kadın`, `erkek`, `diğer`, `belirtmek istemiyorum` (liste benim önerim, kullanıcı sabit liste istedi).
- Doğum tarihi gelecekte olamaz (benim kararım).

**Randevu:** id, sahibi olan kullanıcının id'si, müşteri id'si, tarih, başlangıç saati, bitiş saati, durum, serbest not.

- Durum değerleri: `planlandı`, `tamamlandı`, `iptal`.
- Serbest not isteğe bağlıdır.
- Aynı müşterinin birden çok randevusu olabilir.

## Davranış kuralları

- **Veri sahipliği:** Her müşteri ve randevu tek bir kullanıcıya aittir. Hiçbir uç nokta başka bir kullanıcının kaydını döndürmez ya da değiştirmez.
- **Çakışma:** Aynı kullanıcının iki randevusunun saat aralıkları kesişiyorsa yeni kayıt (veya düzenleme) reddedilir ve istemciye anlaşılır bir hata döner. Başka bir randevunun bitiş saatiyle başlayan randevu çakışma sayılmaz (bu benim kararım).
- **İptal:** Durumu `iptal` olan randevu çakışma kontrolüne girmez; o saat yeni randevuya açılır.
- **Müşteri silme (soft delete):** Müşteri silinince kayıt gerçekten kaldırılmaz, silinme zamanı yazılır. Silinen müşteri müşteri listesinde ve aramada görünmez, yeni randevu verilemez. Müşterinin mevcut randevuları erişilebilir kalır ve takvimde müşterinin adıyla görünmeye devam eder. Silinen müşteriyi geri getirme ilk sürümde yok (benim kararım).
- **Arama:** Kullanıcının kendi aktif müşterileri arasında ad ve soyada göre yapılır.
- **Tarih aralığı:** Haftalık ve aylık takvim aynı uç noktayı kullanır; istemci başlangıç ve bitiş tarihini verir. Günlük liste de aynı uç noktanın tek günlük kullanımıdır.

## Teknoloji (kullanıcının kararları)

- Node.js + Express.
- TypeScript. CLAUDE.md'deki "sadece HTML, CSS ve JS" kuralından bilinçli bir sapmadır; tasarım onaylandığında CLAUDE.md güncellenecek.
- Veriler bellekte.
- Giriş: ilk etapta demo hesaplar; sonra Google ile bağlanma seçeneğine kolay geçiş.

## Mimari

Aşağıdakiler benim önerimdir, kullanıcı henüz ayrıntısını onaylamadı.

- **Çoklu istemci:** Kullanıcı ileride mobil uygulama da yapmak istiyor; mobil teknolojisi henüz belli değil. Bu yüzden API istemciden bağımsız tasarlanır: JSON, `/api/v1` ön eki, dile bağlı olmayan bir API sözleşmesi (OpenAPI) ve hem çerezle hem `Authorization: Bearer` başlığıyla çalışan oturum. İş kuralları yalnızca backend'de durur, hiçbir istemciye kopyalanmaz.
- **Konum (kullanıcı onayladı):** Tek repo, istemci başına bir klasör: `backend/` (API), `web/` (tanıtım sayfası ve panel), `api-contract/` (API sözleşmesi), `docs/` (mevcut). Mevcut `index.html` repo kökünden `web/` altına taşınır; bu taşıma planın bir adımıdır ve CLAUDE.md'deki yollar da güncellenir. Mobil uygulamanın klasörü ve teknolojisi mobil işi başlayınca belirlenir; şimdi `mobile/` oluşturulmaz. Klasör adları küçük harfle ve İngilizce yazılır (kullanıcı "Web/" yazdı; CLAUDE.md'deki adlandırma kuralına uymak için küçük harf benim kararım).
- **Katmanlar:** uç noktalar (HTTP) → servisler (kurallar: çakışma, sahiplik) → depolar (veri erişimi).
- **Depo:** Her depo bir arayüzdür; ilk gerçekleme bellekte çalışır. Veri tabanına geçiş yalnızca bu gerçeklemeyi değiştirir.
- **Kimlik sağlayıcı:** Giriş bir "kimlik sağlayıcı" arayüzünün arkasındadır. İlk gerçekleme, hazır demo hesaplarla e-posta/şifre doğrular. Google sonradan başka bir gerçekleme olarak eklenir. Doğrulama başarılı olunca sağlayıcı bir kullanıcı kimliği döndürür; oturum ve geri kalan sistem yalnızca bu kimliği bilir.
- **Oturum:** Sunucu tarafında tutulur. Web çerezle, mobil `Authorization: Bearer` başlığıyla aynı oturum jetonunu kullanır (benim önerim; mobil planı çerez-yalnız çözümü eledi).
- **Statik dosya:** Aynı sunucu `index.html` gibi arayüz dosyalarını servis edebilir, böylece ayrı sunucu ve CORS ayarı gerekmez (benim önerim).
- **Geliştirme ve yayın:** Geliştirmede TypeScript'i doğrudan çalıştıran bir araç, yayında `tsc` ile derleme. Hangi aracın seçileceği planlamaya bırakılır.

## API (öneri, planda kesinleşir)

- Giriş, çıkış, geçerli kullanıcı.
- Randevu: tarih aralığına göre listele, oluştur, düzenle, sil. İptal, durumu `iptal` yapan bir düzenlemedir.
- Müşteri: listele, ada göre ara, oluştur, düzenle, sil.

JSON ile konuşur. Hatalar tutarlı bir biçimde döner (doğrulama hatası, çakışma, yetkisiz erişim, bulunamadı).

## Demo hesaplar

Birkaç hazır kullanıcı, kod içinde tanımlı. Gerçek parola içermez; yalnızca demo amaçlıdır. Her demo kullanıcının kendi (boş ya da örnek) verisi olur. Örnek veri gerekip gerekmediği planlamaya bırakılır.

## Ayrıntı kararları (benim kararlarım, kullanıcı gözden geçirecek)

- **Panel ve oturum:** Panel, API ile aynı Express sunucusundan servis edilir (aynı origin). CORS gerekmez. Oturum çerezi `HttpOnly` ve `SameSite=Lax` olur. Oturumlar bellekte tutulur, sunucu yeniden başlayınca silinir.
- **Demo hesaplar:** İki demo kullanıcı, sabit parolalar kodda ve hash'li saklanır. Ortam değişkeniyle kapatılabilir; yayında varsayılan olarak kapalıdır.
- **Tarih ve saat:** Tek bir yerel saat varsayılır, saat dilimi saklanmaz. Bitiş saati başlangıçtan büyük olmalıdır; gece yarısını geçen randevu yoktur. Geçmiş tarihe randevu eklenebilir.
- **Sahiplik:** Başka kullanıcının kaydı için `404` döner (kaydın varlığı sızdırılmaz). Başka kullanıcının müşteri id'siyle randevu oluşturmak da `404` ile reddedilir.
- **Durum geçişleri:** Durumlar arasında serbest geçiş vardır. `iptal` durumundan `planlandı`ya dönmek çakışma kontrolünü yeniden çalıştırır. `tamamlandı` randevu çakışmaya girer. Düzenlemede randevunun kendisi çakışmadan hariç tutulur. Silme kalıcıdır; iptal ise kaydı tutar.
- **Çakışma sözleşmesi:** Kontrol serviste yapılır. Depo arayüzü "çakışmayı kontrol ederek ekle" işlemini tek bir çağrı olarak sunar, böylece veri tabanına geçişte bu işlem bir transaction ya da kısıtla gerçeklenebilir.
- **Arama:** Ad ve soyadda büyük/küçük harf ve Türkçe karakter ayrımı yapmaz (İ/ı dahil), "içerir" eşleşmesi kullanır. Tarih aralığı en fazla bir yıl olabilir. Sayfalama ilk sürümde yoktur.
- **Kapsam:** CLAUDE.md güncellemesi, tasarım onaylandıktan sonra planın bir adımıdır. Mimari bölümü, bu belge onaylandığında onaylanmış sayılır.

## Planlayıcıya bırakılanlar

- Klasör ve dosya yapısı, TypeScript araç seçimi, test aracı.
- Kimlik doğrulama için kullanılacak kütüphaneler.
- Doğum tarihi, saat ve tarih biçimlerinin tam gösterimi.
- Tarih ve saat için saat dilimi yaklaşımı (tek bir yerel saat varsayımı yeterli olabilir).
- Örnek verinin kapsamı.

## Doğrulama

Bellekte çalışan depo ve servislerin davranışı (özellikle çakışma ve sahiplik kuralları) otomatik testlerle doğrulanır. Uç noktalar için en az bir uçtan uca deneme yapılır.

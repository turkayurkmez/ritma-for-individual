# Ritma: Google ile giriş ve "iki hafta ücretsiz dene" tasarımı

Tarih: 2026-11-10. Durum: onay bekliyor.

Belgede "**Senin kararın**" diye işaretli maddeler kullanıcının söylediği şeylerdir. "**Benim kararım**" işaretliler, kullanıcıya sorulmadan verilmiş varsayılanlardır; okurken itiraz edilebilir.

## Amaç ve neden

Bugün Ritma'ya yalnızca iki sabit demo hesapla (`ayse@ritma.demo`, `mehmet@ritma.demo`) girilebiliyor. Amaç, isteyen herkesin kayıt formu ve parola uğraşı olmadan Ritma'yı deneyebilmesi. Kişi Google hesabıyla girer, boş bir panel görür, kendi örnek müşteri ve randevusunu ekleyerek uygulamayı dener.

Tanıtım sayfası da buna uyar: "Erken erişim" dili kalkar, yerine "İki hafta ücretsiz dene" gelir.

## Hedefler

1. `/giris` sayfasında "Google ile devam et" düğmesi olur. Google'da onaylayan kişi oturum açar.
2. Google ile ilk kez giren kişi için hesap kendiliğinden oluşur. Aynı Google hesabıyla tekrar girince aynı hesap ve aynı veriler gelir. Her kişinin verisi diğerlerinden ayrıdır (bugünkü kuralla aynı).
3. İlk girişte kişi boş bir panel görür. Panelin üstünde sabit bir şerit yazar: "İki hafta ücretsiz dene". Panelde "Müşteri ekle" ve "Randevu ekle" düğmeleri bulunur; bunlar uygulamadaki normal ekleme formlarını açar.
4. Tanıtım sayfasında "Erken erişim" geçen her yer kalkar. Ana düğme "İki hafta ücretsiz dene" olur ve giriş sayfasına götürür.
5. Demo hesaplar parolayla girişe aynen devam eder.

## Hedef dışı (şimdilik yapılmayacak)

- **Senin kararın:** Süre dolunca hiçbir şey olmaz. Kilit, uyarı, ödeme, kısıtlama yok.
- **Senin kararın:** Şeritte gün sayacı yok ("14 gün kaldı" gibi). Bu yüzden ilk giriş tarihini saklamaya gerek yok.
- **Senin kararın:** Başka giriş yöntemi yok (Microsoft, Apple, e-posta ile kayıt). Yalnızca Google.
- Google hesabının başka bilgilerine (takvim, kişiler) erişilmez. Yalnızca "kim olduğun": Google'ın kişi için sabit kimliği, e-posta ve ad.
- Hesap silme, profil düzenleme, Google'dan çıkış yaptırma yok.
- Giriş denemesi sınırlama (rate limit) yok.

## Yapılmaması gerekenler (başarısızlık sayılır)

- Bir kişi başka birinin müşterisini ya da randevusunu görebiliyorsa.
- Demo hesaplarla parolayla giriş bozulduysa.
- Gerçek Client ID ya da herhangi bir gizli bilgi depoya girdiyse.
- Google'ın doğrulamadığı bir e-posta ile hesap açılabiliyorsa.
- Client ID boşken uygulama çöküyorsa. Boşken yalnızca Google düğmesi görünmemeli.

## Kısıtlar

- Proje kuralları (`CLAUDE.md`): yeni npm kütüphanesi eklenmez. Ön yüz bağımlılık listesi sabittir. Yeni veritabanı değişikliği yeni numaralı `.sql` dosyasıyla yapılır, eskisi değiştirilmez. Yeni rota `api-contract/openapi.yaml`'a yazılır. Backend TDD ile yazılır. Arayüz metinleri Türkçedir. Sade, anlaşılır dil.
- Google'ın giriş düğmesi, Google'ın kendi betiğini (`https://accounts.google.com/gsi/client`) yükler. Bu bir npm bağımlılığı değil, tarayıcıda yüklenen harici bir betiktir. Kullanıcı Google ile girişi istediği için bu kabul edilmiştir.
- **Client ID yer tutucudur (Senin kararın).** Kullanıcı gerçek değeri sonra kendisi dolduracak. Değer boşken uygulama sorunsuz çalışmalı ve Google düğmesi gösterilmemelidir.

## Kullanıcının göreceği davranış

**Giriş sayfası (`/giris`).** En üstte "Google ile devam et" düğmesi. Altında ince bir ayırıcı ("veya demo hesapla") ve bugünkü e-posta/parola formu. Client ID boşsa Google düğmesi ve ayırıcı hiç görünmez, sayfa bugünkü gibidir.

**Google ile giriş.** Düğmeye basılır, Google penceresinde hesap seçilir, sayfa kendiliğinden `/panel`'e geçer. Giriş başarısız olursa (Google kimliği geçersiz, e-posta doğrulanmamış) formun altındaki hata alanında Türkçe, sade bir mesaj görünür.

**İlk girişte panel.** Günlük görünüm açılır. Üstte indigo "İki hafta ücretsiz dene" şeridi, altında bugünün tarihi, ortada boş durum kutusu: "Bu gün için randevu yok." metni ve "Müşteri ekle", "Randevu ekle" düğmeleri. Düğmeler hazır kayıt oluşturmaz; var olan formları açar. Kişi hiç müşteri eklemeden randevu ekleyemeyeceği için "Müşteri ekle" ilk adımdır. Boş durum kutusu, o günde randevu yoksa her kullanıcıya gösterilir (müşteri sayısına bakılmaz; böylece ek bir istek gerekmez). Onaylanan taslaktaki "Müşteri de yok" cümlesi bu yüzden kalktı; **benim kararım**.

**Şerit.** Panel yerleşiminin (`PanelLayout`) en üstünde durur; günlük, haftalık, aylık ve müşteriler sayfalarının hepsinde görünür. Sabit yazıdır, kapatılmaz, sayaç içermez.

**Tanıtım sayfası.** Ana düğme "İki hafta ücretsiz dene" yazar ve `/giris`'e götürür. "Erken erişim" etiketi, "Listeye ilk yazılanlardan ol" bölümü ve e-posta kayıt formu kaldırılır. Alt bilgideki "Erken erişim" bağlantısı kalkar, "Giriş" bağlantısı kalır.

## Teknik yaklaşım (hepsi **benim kararım**, uygulayıcı gerekirse daha iyisini önerebilir)

**Akış.** Tarayıcıda Google düğmesi, kişi onaylayınca bir "kimlik belgesi" (ID token) verir. Ön yüz bunu `POST /api/v1/auth/google` ile `{ "credential": "..." }` olarak gönderir. Sunucu belgeyi doğrular, kullanıcıyı bulur ya da oluşturur, bugünkü girişle aynı biçimde oturum açar: HttpOnly çerez ve `{ token, user }` yanıtı.

**Doğrulama.** Yeni kütüphane eklenmez. Sunucu, belgeyi Google'ın doğrulama adresine (`https://oauth2.googleapis.com/tokeninfo`) standart `fetch` ile sorar. Sonra kendisi şunları kontrol eder: belgenin hedefi (`aud`) bizim Client ID'miz, yayıncı (`iss`) Google, süresi dolmamış, `email_verified` doğru. Not: Google bu adresi "hata ayıklama için" diye tanıtır ve küçük trafik için uygundur. Bu aşamada yeterli; trafik büyürse Google'ın açık anahtarlarıyla yerel doğrulamaya geçilir. Doğrulayıcı bir arayüzün arkasında durur, böylece testlerde sahtesi kullanılır ve gerçek Google'a istek atılmaz.

**Yapılandırma.** `backend/.env` içine `GOOGLE_CLIENT_ID=` satırı (boş, `.env.example`'a yorumla birlikte eklenir). `Config`'e `googleClientId: string | undefined` eklenir. Ön yüz Client ID'yi derleme zamanında değil, sunucudan öğrenir: herkese açık `GET /api/v1/auth/config` yanıtı `{ "googleClientId": string | null }` döner. Böylece Client ID sonradan `.env`'e yazılınca ön yüzü yeniden derlemek gerekmez. Client ID gizli bilgi değildir, ama yine de depoya yazılmaz.

**Client ID boşken.** `GET /auth/config` `null` döner, ön yüz Google düğmesini göstermez. `POST /auth/google` çağrılırsa mevcut hata biçimiyle `not_found` (404) döner: "Google ile giriş açık değil."

**Kullanıcı kaydı.** Yeni migration: depo kökündeki `db/migrations/002_google_identity.sql` (`001_init.sql`'in yanında; `backend/` altında değil). `users` tablosuna boş olabilen `google_sub text` eklenir, dolu değerler için benzersiz indeks konur. Kişi, e-postayla değil bu sabit Google kimliğiyle (`sub`) tanınır; çünkü e-posta zamanla değişebilir. Yeni kullanıcının `id`'si sunucuda üretilir (örn. `user-` + rastgele kimlik), görünen adı Google'daki addır, ad yoksa e-postanın baş kısmı.

**Kullanıcı deposu tek kaynak olur.** Bellek ve Postgres için ortak bir kullanıcı deposu eklenir (`findById`, `findByGoogleSub`, `createGoogleUser`). Her ikisi aynı davranış testlerini paylaşır (mevcut `repositories/contract/` düzeni). Demo kullanıcılar da bu depoya konur: Postgres'te bugün olduğu gibi `users` tablosuna, bellek modunda bellekteki depoya (demo hesaplar açıksa, başlangıçta). Oturumdan kullanıcıyı bulma (`SessionService.authenticateToken`) artık yalnızca bu depoya bakar; böylece demo kapalı + Google açık durumunda (üretimde varsayılan) oturumlar yine çözülür. `DemoIdentityProvider` yalnızca parolayı doğrulamaya devam eder; kullanıcıyı depodan okur. `IdentityProvider.findUser` bu yüzden kalkar ya da depoya yönlenir; ayrıntı uygulayıcıya aittir. `DATABASE_URL` yokken de Google kullanıcıları oluşabilir.

**Hiç giriş yöntemi açık değilse.** Üretimde demo hesaplar varsayılan kapalıdır ve Client ID doldurulana kadar Google da kapalıdır; o durumda kimse giriş yapamaz. Bu bilinçli kabul edilir (yapılandırma eksiği, hata değil). Giriş sayfası yine açılır; Google düğmesi yoktur, demo formu vardır ve çalışmaz.

**Kişiyi tanıma ve e-posta.** Önce `google_sub` ile aranır. Bulunursa o hesap açılır; e-posta ve ad sonradan değişmiş olsa bile güncellenmez. Bulunamazsa yeni hesap açılır. Yeni hesabın e-postası (`lower(email)` ile karşılaştırılır) başka bir satırda zaten varsa (şu an olası değil: demo hesaplar `@ritma.demo`) hesap açılmaz; `conflict` (409) ve Türkçe bir mesaj döner. Hesap birleştirme yapılmaz.

**Hata kodları (`POST /auth/google`).** Mevcut hata biçimi (`{ "error": { "code", "message" } }`) korunur.
- `credential` yok ya da metin değil: `validation_error` (400).
- Google belgeyi geçersiz sayarsa, süresi dolmuşsa, hedefi başka bir Client ID ise ya da e-posta doğrulanmamışsa: `unauthorized` (401). Her durum için ayrı, sade bir Türkçe mesaj yazılır (örn. "Google hesabının e-postası doğrulanmamış.").
- Client ID tanımlı değil: `not_found` (404), "Google ile giriş açık değil."
- Google'a ulaşılamıyor, 5xx dönüyor ya da 5 saniye içinde yanıt vermiyor: yeni `upstream_error` kodu, HTTP 502, "Google ile bağlantı kurulamadı, biraz sonra tekrar dene." Hata kodları listesine bu kod `openapi.yaml` ve `CLAUDE.md`'de eklenir. `fetch`'e 5 saniyelik zaman aşımı konur.
- Aynı e-posta çakışması: `conflict` (409), yukarıdaki gibi.

**Ön yüz.** `AuthProvider`'a `loginWithGoogle(credential)` eklenir. Login sayfası Google'ın betiğini yükleyip düğmeyi çizer. Testlerde gerçek betik yüklenmez, sahte bir `window.google` kullanılır. Şerit için küçük bir `TrialBanner` bileşeni `PanelLayout`'a konur. Günlük görünümün "randevu yok" boş durumuna "Müşteri ekle" ve "Randevu ekle" düğmeleri konur (mevcut `CustomerForm` ve `AppointmentForm` yeniden kullanılır).

**Tanıtım sayfası temizliği.** `SignupForm.tsx`, `signup.ts` ve testleri silinir (artık kullanılmayan kod kalmasın). `CLAUDE.md`'deki "Kayıt formu … `FORM_ENDPOINT`" maddesi, giriş akışını anlatan yeni bir maddeyle değiştirilir.

**Belgeler.** `api-contract/openapi.yaml`'a iki yeni rota (`POST /auth/google`, `GET /auth/config`) yazılır. `CLAUDE.md`'ye Google girişi ve `GOOGLE_CLIENT_ID` notu eklenir.

## Uygulayıcıya bırakılanlar

- Dosya ve sınıf adları, yerleşim ayrıntıları.
- Şeridin, ayırıcının ve boş durum kutusunun tam görünümü (mevcut "keskin ve teknik" stilde: indigo vurgu, 2px kenarlık, monospace başlıklar). Taslak, onaylanan A seçeneğidir.
- Hata mesajlarının tam Türkçe metni (sade dille).
- Testlerin ayrıntısı, proje kurallarına uygun (`fireEvent`, `stubFetch`, `startTestServer`).

## Açık noktalar

- Google Cloud'da gerçek Client ID oluşturma ve izinli adresleri (`http://localhost:3000`, canlı adres) tanımlama işi kullanıcıdadır. Bu belgenin kapsamı dışındadır; Client ID doldurulana kadar özellik kapalı kalır.
- `.superpowers/` klasörü şu an git tarafından yok sayılmıyor (kök dizinde `.gitignore` yok). Bu özellikten bağımsız, ayrıca ele alınmalı.

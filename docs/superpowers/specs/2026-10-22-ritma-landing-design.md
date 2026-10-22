# Ritma tanıtım sayfası: tasarım

Tarih: 2026-10-22

## Amaç
Ritma'nın (serbest çalışan hizmet sağlayıcılar için randevu ve müşteri takip sistemi) fikrini göstermek ve erken erişim kayıtlarıyla ilgiyi ölçmek. Sayfa şimdilik ürünün kendisi için değil, ilgi ölçümü içindir.

Başarı ölçütü: ziyaretçi sayfada Ritma'nın ne olduğunu anlar, formu doldurur, kayıt bir form servisine düşer. İlgi, servis panelindeki kayıt sayısı ve meslek dağılımıyla ölçülür. Sayfa içinde analitik ya da sayaç yoktur.

## Kısıtlar (CLAUDE.md)
- Sadece HTML, CSS ve JS. Framework, kütüphane, derleme aracı yok.
- Tek dosya: `index.html`. Stiller dosyanın içinde, JS sayfa sonunda küçük bir `<script>` bloğunda.
- Renkler `:root` CSS değişkenlerinden. Koyu tema `prefers-color-scheme: dark` ile.
- Telefonda düzgün görünür. Kullanıcıya görünen metinler Türkçe.
- Dosya, klasör ve `id` adları ASCII ve İngilizce/karaktersiz.
- Sormadan commit veya push yapılmaz.

## Sayfa yapısı (sırayla)
1. **Hero:** Masaüstünde iki kolon. Solda mevcut `h1`, slogan ve "Erken erişim için kaydol" butonu (`#erken-erisim`). Sağda uygulama önizlemesi. Telefonda tek sütun: metin ve buton üstte, önizleme altta; buton ilk ekranda görünür kalır.
2. **Sorun ve çözüm** (`id="sorun-cozum"`): İki kolon. Sorun: dağınık not defterleri, WhatsApp'ta randevu kovalamak, unutulan müşteri notları. Çözüm: tek yerde takvim ve müşteri geçmişi.
3. **Nasıl çalışır** (`id="nasil-calisir"`): Numaralı üç adım kartı: müsait saatleri belirle, müşterilerin randevu alsın, notları ve geçmişi tek yerden takip et.
4. **Erken erişim formu** (`id="erken-erisim"`): aşağıda.
5. **Alt bilgi** (`<footer>`): "© 2026 Ritma", kısa slogan, bölümlere bağlantılar (Sorun ve çözüm, Nasıl çalışır, Erken erişim). Gizlilik/iletişim bağlantısı yok (henüz sayfa yok).

Kapsam dışı: SSS, fiyatlandırma, sabit üst menü, analitik, gerçek form servisinin seçimi.

## Hero önizlemesi
- Küçük bir uygulama penceresi: haftalık takvimde iki üç örnek randevu ve seçili bir müşteri kartı.
- Tamamen HTML ve CSS. Görsel dosya, SVG kütüphanesi yok.
- Uydurma örnek adlar kullanılır. Sayfada "gerçek müşteri", kullanıcı sayısı ya da benzeri iddia yazılmaz.
- Süs olduğu için ekran okuyucudan gizlenir; dış kapsayıcıda kısa `aria-label` ("Ritma uygulama önizlemesi").

## Erken erişim formu
- **Alanlar:** ad soyad, e-posta, meslek (select: Danışman, Koç, Eğitmen, Diyetisyen, Diğer). Meslek alanı ilginin hangi meslekten geldiğini ölçmek içindir.
- **Doğrulama (tarayıcıda, JS):** ad boş olamaz; e-posta `/^\S+@\S+\.\S+$/` kalıbına uymalı; meslek seçilmeli. Hatalı alanın altında `role="alert"` mesaj, alanda `aria-invalid="true"`, ilk hatalı alana odak. Her alanın `<label>`'ı vardır. Form `novalidate`.
- **Gönderim:** `fetch` ile tek bir sabite (`FORM_ENDPOINT`) POST. Servis seçilince yalnızca bu satır değişir. Gönderirken buton kilitlenir (çift gönderimi önler).
- **Yer tutucu durumu:** `FORM_ENDPOINT` başlangıçta boş string (`""`) olur; boşsa yer tutucu sayılır. Bu durumda form hiçbir şey göndermez ve ziyaretçiye hata gösterir ("Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin."). Başarılıymış gibi davranmaz; aksi halde yayında kayıtlar sessizce kaybolur.
- **Başarı:** form gizlenir, `aria-live="polite"` bölgede teşekkür mesajı görünür.
- **Ağ/servis hatası:** form açık kalır, girilenler silinmez, hata mesajı gösterilir.
- **Gizlilik satırı (taslak):** formun altında "E-postanız yalnızca Ritma duyuruları için kullanılacak." Bu bir taahhüttür; yayından önce sahibi tarafından doğrulanmalıdır.

## Stil
- `body`'den `display: grid; place-items: center; min-height: 100vh` kaldırılır; bölümler alt alta akar. Mevcut `p` kuralı hero'ya özgü olduğundan `.hero p` olarak daraltılır.
- Mevcut `:root` değişkenleri (`--bg`, `--fg`, `--muted`, `--accent`, `--accent-hover`, `--glow`) korunur. Açık ve koyu temaya iki yeni değişken eklenir: `--surface` (kart ve önizleme zemini), `--border`.
- Mevcut `.cta` butonu hero'da ve formda yeniden kullanılır.
- Bölüm boşlukları `clamp()` ile; içerik genişliği için `.container { max-width: 60rem; margin: 0 auto; }`.
- Kart ızgaraları `repeat(auto-fit, minmax(16rem, 1fr))` ile kendiliğinden tek sütuna düşer. Hero iki kolonu için tek medya sorgusu.
- `html { scroll-behavior: smooth; }`

## Erişilebilirlik
- Başlıklar: hero `h1`, bölümler `h2`, kartlar `h3`.
- `:focus-visible` halkaları `.cta` ile tutarlı, form alanlarında da.
- Koyu temada `--surface` ve `--border` kontrastı iki temada da kontrol edilir.
- `id`'ler: `sorun-cozum`, `nasil-calisir`, `erken-erisim`.

## Doğrulama (elle; test altyapısı yok)
1. `python -m http.server 8000` ile `http://localhost:8000` aç.
2. Açık ve koyu temada tüm bölümleri gez.
3. 360px genişlikte yatay kaydırma olmadığını, hero'nun tek sütuna düştüğünü ve butonun ilk ekranda göründüğünü doğrula.
4. Form durumları: boş gönderim, geçersiz e-posta, yer tutucu adres (hata göstermeli), geçici sahte çalışan adres (teşekkür mesajı), ağ hatası (form açık kalmalı).
5. Hero butonu ve alt bilgi bağlantıları doğru bölüme kayıyor mu? Klavye ile tab sırası ve odak halkaları.
6. Konsolda hata olmadığını kontrol et.

## Açık noktalar
- Form servisi seçilmedi (Formspree, Web3Forms vb.). Seçilene kadar `FORM_ENDPOINT` yer tutucudur ve form hata gösterir. Servis eklemek CLAUDE.md gereği ayrıca onay gerektirir.
- Gizlilik satırının doğruluğu sahibi tarafından onaylanmalı.

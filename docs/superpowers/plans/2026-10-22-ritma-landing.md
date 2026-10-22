# Ritma Tanıtım Sayfası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tek dosyalı `index.html` landing page'ini hero + önizleme, sorun-çözüm, nasıl çalışır, erken erişim formu ve alt bilgiden oluşan çok bölümlü sayfaya çevirmek.

**Architecture:** Tek `index.html`. Stiller `<style>` içinde, mevcut `:root` değişkenlerine iki yeni değişken eklenir. JS sayfa sonunda tek `<script>` bloğunda; form mantığı iki global fonksiyon (`validateSignup`, `sendSignup`) ve bir `submit` dinleyicisinden oluşur. Önizleme saf HTML/CSS.

**Tech Stack:** HTML, CSS, vanilla JS. Kütüphane, derleme aracı, test çerçevesi yok.

**Spec:** `docs/superpowers/specs/2026-10-22-ritma-landing-design.md`

## Global Constraints

- Sadece HTML, CSS, JS. Framework/kütüphane yok. Tek dosya: `index.html`.
- Renkler `:root` değişkenlerinden; koyu tema `prefers-color-scheme: dark` ile. Yeni değişkenler: `--surface`, `--border` (iki temada da).
- Telefonda (360px) yatay kaydırma yok. Metinler Türkçe; `id`/sınıf adları ASCII: `sorun-cozum`, `nasil-calisir`, `erken-erisim`.
- Başlıklar: hero `h1`, bölümler `h2`, kartlar `h3`. Her form alanında `<label>`.
- Hero butonu `.cta` ve `href="#erken-erisim"` olarak kalır.
- `FORM_ENDPOINT` başlangıçta `""`. Boşken form hiçbir şey göndermez ve hata gösterir; asla başarı göstermez.
- Önizlemede uydurma adlar; "gerçek müşteri"/sayı iddiası yok. Gizlilik satırı: "E-postanız yalnızca Ritma duyuruları için kullanılacak."
- **Sormadan commit veya push yok.** Aşağıdaki "Commit" adımları kullanıcıya sorma adımıdır; onay yoksa atlanır.
- Test altyapısı yok: doğrulama tarayıcıda elle ve konsol çağrılarıyla. Sunucu: `python -m http.server 8000`.

## Review Focus

- Boşluk-only ad ("   "): hata vermeli (her task 3 testinde).
- JS kapalıyken form gönderilirse e-posta URL'ye düşmemeli: `method="post"` + `<noscript>` uyarısı.
- Hata sonrası düzeltilip gönderilince eski hata mesajları ve `aria-invalid` temizlenmeli.
- Ağ hatasında girilen değerler silinmemeli, buton tekrar açılmalı.
- 320px ve 768px genişlikte taşma yok; hero iki kolona yalnızca `min-width: 48rem` üstünde geçer.
- `prefers-reduced-motion: reduce` iken yumuşak kaydırma kapalı.

---

### Task 1: Temel düzen ve hero iki kolon + önizleme

**Files:**
- Modify: `index.html` (mevcut `<style>` ve `<body>`)

**Interfaces:**
- Produces: `.container` (max-width 60rem, ortalı), `section` dikey boşluğu, `--surface`/`--border` değişkenleri, `.hero` (iki kolon yapı), `.preview` (önizleme kökü). Sonraki task'lar bunları kullanır.

- [ ] **Step 1: `:root` ve koyu tema bloklarına `--surface` ve `--border` ekle** (açık: beyaza yakın zemin; koyu: `--bg`'den biraz açık). Kontrast iki temada okunaklı olmalı.
- [ ] **Step 2: `body`'den `display: grid`, `place-items: center`, `min-height: 100vh` ve `padding`'i kaldır.** `p` kuralını `.hero p` olarak daralt. Eklenecek: `.container`, `section { padding: clamp(3rem, 8vw, 6rem) 16px }`, `html { scroll-behavior: smooth }` ve `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`.
- [ ] **Step 3: `<main class="hero">`'yu `<main>` içine `<section class="hero"><div class="container hero-grid">` olarak taşı.** Sol: mevcut `h1`, `p`, `.cta` (metin kolonu `.hero-copy`). Sağ: `<div class="preview" role="img" aria-label="Ritma uygulama önizlemesi">`. `.hero-copy` içindeki metin tüm genişliklerde sola hizalanır (mevcut `text-align: center` kaldırılır).
- [ ] **Step 4: Önizleme içeriğini (HTML/CSS) yaz:** üstte pencere çubuğu (üç nokta), solda Pzt/Sal/Çar sütunlu mini haftalık takvim ve 2-3 uydurma randevu bloğu (ör. "10:00 Ayşe", "14:00 Can"), sağda/altında seçili müşteri kartı (ad, son randevu, kısa not). İçerideki tüm öğeler `aria-hidden="true"`.
- [ ] **Step 5: `.hero-grid` için `display: grid; gap: 2.5rem` ve `@media (min-width: 48rem) { grid-template-columns: 1fr 1fr; align-items: center }`.** Telefonda tek sütun; `.cta` ilk ekranda görünür kalmalı.
- [ ] **Step 6: Doğrula.** `python -m http.server 8000`, `http://localhost:8000` aç.
  - 1200px: iki kolon, önizleme sağda. 360px: tek sütun, buton ilk ekranda, yatay kaydırma yok.
  - OS/DevTools ile koyu temaya geç: önizleme ve metin okunaklı.
  - Konsolda hata yok.
- [ ] **Step 7: Commit — kullanıcıya sor.** Onay gelirse: `git add index.html docs && git commit -m "feat: hero iki kolon ve uygulama önizlemesi"`.

---

### Task 2: Sorun-çözüm ve Nasıl çalışır bölümleri

**Files:**
- Modify: `index.html` (hero sonrası, `</main>` öncesi)

**Interfaces:**
- Consumes: `.container`, `section`, `--surface`, `--border` (Task 1).
- Produces: `#sorun-cozum`, `#nasil-calisir` (alt bilgi bağlantıları bunlara gider), `.card` sınıfı (Task 3 formda da kullanabilir).

- [ ] **Step 1: `.card` ve `.grid` stilleri.** `.card`: `--surface` zemin, `--border` kenarlık, yuvarlak köşe, iç boşluk. `.grid`: `display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))`.
- [ ] **Step 2: `<section id="sorun-cozum">` ekle.** `h2` ("Randevu takibi neden bu kadar dağınık?" gibi sorun odaklı başlık) ve `.grid` içinde iki `.card`: "Sorun" (dağınık not defterleri, WhatsApp'ta randevu kovalamak, unutulan müşteri notları — `ul`) ve "Çözüm" (tek yerde takvim ve müşteri geçmişi). Kart başlıkları `h3`.
- [ ] **Step 3: `<section id="nasil-calisir">` ekle.** `h2` ve `.grid` içinde üç `.card`: "Müsait saatlerini belirle", "Müşterilerin randevu alsın", "Notları ve geçmişi tek yerden takip et". Her kartta `--accent` renkli numara rozeti (1, 2, 3) ve `h3`; kısa bir cümle açıklama.
- [ ] **Step 4: Doğrula.** 1200px: kartlar yan yana. 360px: tek sütun, taşma yok. Koyu temada kart/kenarlık kontrastı yeterli. Hero butonu henüz forma gitmiyor (Task 3'te `#erken-erisim` eklenecek), şimdilik sadece kaydırmanın bozulmadığını kontrol et.
- [ ] **Step 5: Commit — kullanıcıya sor.** Onay gelirse: `git add index.html && git commit -m "feat: sorun-cozum ve nasil calisir bolumleri"`.

---

### Task 3: Erken erişim formu, JS ve alt bilgi

**Files:**
- Modify: `index.html` (form bölümü, `<footer>`, sayfa sonuna `<script>`)

**Interfaces:**
- Consumes: `.card`, `.cta`, `--accent`, `--border` (Task 1-2).
- Produces (global, konsoldan çağrılabilir):
  - `const FORM_ENDPOINT = ""`
  - `validateSignup(values: {name: string, email: string, job: string}) -> {name?: string, email?: string, job?: string}` — yalnızca hatalı alanlar için Türkçe mesaj döner; geçerliyse `{}`.
  - `sendSignup(values) -> Promise<void>` — `FORM_ENDPOINT === ""` ise veya yanıt `ok` değilse reddeder; aksi halde `fetch(FORM_ENDPOINT, {method: "POST", headers: {"Content-Type": "application/json", "Accept": "application/json"}, body: JSON.stringify(values)})`.

- [ ] **Step 1: Doğrulamayı konsolda başarısız göster (script yokken).** Sayfada `validateSignup` yazıp çalıştır. Beklenen: `ReferenceError: validateSignup is not defined`.
- [ ] **Step 2: `<script>` içinde `FORM_ENDPOINT` ve `validateSignup` yaz.** Kurallar: `name.trim()` boşsa hata; `email` `/^\S+@\S+\.\S+$/` ile eşleşmeli; `job` boş olmamalı. Konsolda doğrula:
  - `validateSignup({name: "   ", email: "a b", job: ""})` → üç anahtar da var.
  - `validateSignup({name: "Ayşe Kaya", email: "ayse@ornek.com", job: "Koç"})` → `{}`.
- [ ] **Step 3: `<section id="erken-erisim">`'ni ekle.** `h2`, `<form novalidate method="post">`, alanlar: `name` (text, autocomplete `name`), `email` (email, autocomplete `email`), `job` (select: boş seçenek "Seçin…", Danışman, Koç, Eğitmen, Diyetisyen, Diğer). Her alanın `<label for>`'ı ve altında `<p class="error" id="…-error" role="alert" hidden>`. Gönder düğmesi `.cta` (`<button type="submit">`). Formun altında gizlilik satırı (Global Constraints'teki metin) ve `<noscript><p>Formu göndermek için JavaScript gerekir.</p></noscript>`. Formun yanında/altında `<div id="signup-status" aria-live="polite"></div>`. Form alanları için `:focus-visible` halkası `.cta` ile tutarlı.
- [ ] **Step 4: `sendSignup` ve `submit` dinleyicisini yaz.** Akış: `preventDefault` → önceki hataları ve `aria-invalid`'i temizle → `validateSignup`; hata varsa mesajları göster, alanlara `aria-invalid="true"`, ilk hatalı alana `focus()` ve dur → buton `disabled` → `sendSignup`; başarılıysa formu gizle, `#signup-status`'e teşekkür mesajı yaz; hata olursa `#signup-status`'e "Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin." yaz, form açık ve değerler korunmuş kalır → `finally` ile buton tekrar etkin.
- [ ] **Step 5: `<footer>` ekle.** "© 2026 Ritma", kısa slogan ("Kendi ritminizde.") ve `#sorun-cozum`, `#nasil-calisir`, `#erken-erisim` bağlantıları.
- [ ] **Step 6: Doğrula (tarayıcıda).**
  - Boş gönder: üç hata mesajı, ilk alana odak.
  - Boşluk-only ad + geçersiz e-posta: hata. Sonra düzelt ve gönder: eski hata mesajları kayboldu, `aria-invalid` kalktı.
  - Geçerli veri, `FORM_ENDPOINT = ""`: hata mesajı görünür, **teşekkür mesajı görünmez**, değerler duruyor, buton tekrar etkin.
  - Ağ hatası: `FORM_ENDPOINT`'i geçici olarak `"http://localhost:9/x"` yap, kaydet, geçerli veriyle gönder → hata mesajı, form açık, değerler duruyor.
  - Başarı: scratchpad'de her isteğe `200` ve CORS izni (`Access-Control-Allow-Origin: *`) ile yanıt veren geçici bir Python betiği çalıştır, `FORM_ENDPOINT`'i ona yönelt → form gizlenir, teşekkür mesajı görünür.
  - Geçici değişiklikleri geri al; `FORM_ENDPOINT = ""` olarak bıraktığını ve betiğin durduğunu doğrula.
  - Hero butonu ve alt bilgi bağlantıları doğru bölüme kayıyor. Klavyeyle tab sırası ve odak halkaları düzgün. 360px'te taşma yok. Koyu tema okunaklı. Konsolda hata yok.
- [ ] **Step 7: Commit — kullanıcıya sor.** Onay gelirse: `git add index.html && git commit -m "feat: erken erisim formu, dogrulama ve alt bilgi"`.

---

## Self-review

- **Spec kapsamı:** Hero iki kolon + önizleme (Task 1), sorun-çözüm ve nasıl çalışır (Task 2), form/doğrulama/yer tutucu davranışı/gizlilik satırı/alt bilgi (Task 3), stil ve erişilebilirlik (Task 1-3), doğrulama listesi (her task'ın doğrulama adımı). Eksik yok.
- **Tip tutarlılığı:** `validateSignup`/`sendSignup`/`FORM_ENDPOINT` ve `.card`, `.container` adları task'lar arasında aynı.
- **Orantı:** Plan, spec'in kapsamıyla uyumlu; gövde kodu yazılmadı.

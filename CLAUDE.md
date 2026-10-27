# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma, serbest çalışan hizmet sağlayıcılar (danışman, koç, eğitmen, diyetisyen vb.) için planlanan bir randevu ve müşteri takip sistemidir. Şu an yalnızca tanıtım sayfası var: hero + uygulama önizlemesi, sorun ve çözüm, nasıl çalışır, erken erişim formu, alt bilgi. Amaç ilgi ölçmek (erken erişim kayıtları). Arayüz metinleri Türkçedir.

## Teknoloji

- Ön yüz (`web/`) sadece HTML, CSS ve JavaScript kullanır. Backend (`backend/`) Node.js + Express + TypeScript ile yazılır.
- Ön yüzde framework, derleme aracı veya paket yöneticisi yoktur.
- Mevcut sayfa tek dosyadır (`web/index.html`), stiller dosyanın içindedir.

## Tasarım

- Yön: "keskin ve teknik" (indigo vurgu, 2px kenarlık, sert gölge, monospace başlıklar). Değerler `web/index.html` içindeki `:root` değişkenlerinde.
- Tasarım belgesi: `docs/superpowers/specs/`, uygulama planı: `docs/superpowers/plans/`.

## Komutlar

Ön yüz için kurulum, derleme, lint veya test komutu yoktur. Doğrulama için:

- Görsel kontrol: `chrome.exe --headless=new --screenshot=<dosya.png> --window-size=1200,900 file:///.../web/index.html`. Başsız Chrome 500px'ten dar pencere açmaz; telefon genişliğini 360px'lik bir `<iframe>` içinde ölç.
- Koyu tema için `--blink-settings` işe yaramadı; `prefers-color-scheme` satırını `@media all` yapan geçici bir kopya kullan.
- `validateSignup` / `sendSignup` global fonksiyonlar; `node` ile `vm` içinde çalıştırılabilir. Geçici betikleri projeye değil scratchpad'e koy.

- Sayfayı görmek için `web/index.html` dosyasını tarayıcıda aç.
- İstersen yerel sunucu ile de açabilirsin: `python -m http.server 8000`, sonra `http://localhost:8000`.

## Kurallar

- Dosya ve klasör adları İngilizce olur (örnek: `index.html`, `styles.css`, `script.js`).
- Ön yüz (`web/`) için sadece HTML, CSS ve JS yaz. Backend (`backend/`) TypeScript ile yazılır. Başka teknoloji gerekirse önce kullanıcıya sor.
- Renkler `:root` içindeki CSS değişkenlerinden gelir. Koyu tema `prefers-color-scheme: dark` ile ayarlanır.
- Sayfa telefon ekranında da düzgün görünmelidir.
- Kullanıcıya görünen metinler Türkçe, açıklamalar sade bir dille yazılır.
- Form `web/index.html` sonundaki `FORM_ENDPOINT` sabitine POST eder. Sabit boşken form hata gösterir (kayıt kaybolmasın diye başarı göstermez). Form servisi seçilmedi; yayından önce adresi yazın. Harici servis eklemek için önce sor.

## Yasaklar

- Türkçe dosya veya klasör adı verme.
- Sormadan framework veya kütüphane (React, Tailwind, jQuery vb.) ekleme.
- Sormadan commit atma veya push yapma.

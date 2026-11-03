---
name: sharpening-prompts
description: Use when a request for code, a feature, a fix or a refactor is vague, underspecified or leaves assumptions open (no clear scope, no way to tell when it is done, "şunu yap", "şöyle olsun", "düzelt", "ekle", "iyileştir"), before reading files or editing anything.
---

# Belirsiz isteği netleştirme

## Özet

Belirsiz isteği **doğrudan uygulama**. Önce "iyi prompt" ölçütlerine göre eksiklerini bul, cevabı projede olanı kendin çöz, kalan kararları kullanıcıya sor, sonra iyileştirilmiş promptu göster ve **onay bekle**.

## "İyi prompt" tanımı

Ritma'da bir ajanın soru sormadan doğru işi yapabileceği prompt. Altı ölçüt:

| # | Ölçüt | Eksikse önce nereye bak |
|---|-------|-------------------------|
| 1 | **Hedef** tek cümleyle net | İsteğin kendisi; çıkarılamazsa sor |
| 2 | **Kapsam** sınırlı (görev, klasör, dosya: `frontend/`, `backend/`, `api-contract/`) | Plan (`docs/superpowers/plans/`), ledger, hafıza, kod |
| 3 | **Başarı ölçütü** doğrulanabilir (hangi test/komut geçmeli, ekranda ne görünmeli) | CLAUDE.md "Komutlar": ön yüz `npm test` + `npm run build`; backend `npm test` + `npm run build`. Görünüm işlerinde ek olarak CLAUDE.md "Görsel kontrol" ile ekran görüntüsü (masaüstü + 360px) |
| 4 | **Proje kısıtlarına uyumlu** (bağımlılık listesi, Türkçe arayüz, İngilizce dosya adı, `feat/...` dalı + PR, sormadan commit yok) | CLAUDE.md "Teknoloji", "Kurallar", "Yasaklar" |
| 5 | **Varsayımlar** yazılı ya da sorulmuş | Kodda doğrulanabilenleri doğrula; kalanı sor |
| 6 | **Yapılmayacaklar** belli | Kapsam dışı komşu işleri listele |

## Ne zaman kullan

- İstek ≥2 ölçütü karşılamıyor ve iş koda dokunacak ya da bir karar gerektirecek.

**Kullanma:** "devam et" gibi onaylı plana/ledger'a bağlı istekler, saf sorular, tek satırlık açık düzeltmeler, ölçütleri zaten karşılayan promptlar.

## Akış

1. Altı ölçütü isteğe karşı tart.
2. **Ön koşulu doğrula:** isteğin dayandığı ekran, rota, alan, API ya da davranış kodda gerçekten var mı? "Düzelt" diyen istekte hata tekrar edilebiliyor mu? Yoksa bunu Varsayımlar'a yaz ve gerekiyorsa sor.
3. **Planla eşleştir:** istek `docs/superpowers/plans/` içindeki bir göreve karşılık geliyorsa, ledger'a bakıp görevin durumunu belirle ve promptun Kapsam'ına görev numarasını yaz (ayrı bir iş gibi kurma).
4. Cevabı CLAUDE.md, plan, ledger, hafıza ya da kodda olanı **sorma**, kendin oku ve doldur.
5. Kalan gerçek kararları tek turda `AskUserQuestion` ile sor: **en fazla 5 soru**, her birinde önerilen seçenek ilk sırada ve "(Recommended)" ile.
6. Çıktıyı aşağıdaki sözleşmeye göre göster, sonra dur ve onay iste. Onaydan önce dosya düzenleme, komut çalıştırma, dal açma yok.

## Çıktı sözleşmesi

Sırayla: **Anladığım** (1 cümle) → **Önce / Sonra** (kullanıcının metni ve iyileştirilmiş prompt) → iyileştirilmiş promptun bölümleri **Hedef, Kapsam, Başarı ölçütü, Kısıtlar, Varsayımlar, Yapılmayacaklar** → "Bu haliyle başlayayım mı?" Boş bölüm "Yok" yazılır, atlanmaz. Onaylanan prompt işin tek kaynağıdır.

## Sık hatalar

| Hata | Doğrusu |
|------|---------|
| Kodda ya da CLAUDE.md'de yazanı kullanıcıya sormak | Önce oku, yalnızca çözemediğini sor |
| 5'ten fazla soru, art arda turlar | Tek tur, en çok 5 |
| Kullanıcının niyetine yeni özellik eklemek | Kapsamı büyütme; fazlalığı "Yapılmayacaklar"a yaz |
| Promptu şişirmek | Her bölüm 1-3 madde |
| Onaysız işe başlamak | Onay gelmeden araç çağırma |
| Yeni özellik/davranış değişikliğinde tasarımı atlamak | Onaydan sonra `superpowers:brainstorming` akışı sürer |

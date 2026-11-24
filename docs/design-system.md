# Ritma Android Tasarım Sistemi

Durum: öneri, onaylandı (pastel, üç boyutlu butonlar, açık ve koyu tema). Kaynak: Claude Artifact "Ritma Android". Web arayüzünün tasarımına bağlı değildir.

İçindekiler: Tasarım ilkeleri, Tokenlar, Bileşenler, Android uygulaması.

---

## Tasarım ilkeleri

Ritma Android, serbest çalışan uzmanın günü boyunca tek soruyu cevaplar: "Şimdi ne yapmalıyım?" Görünüm yumuşak ve pastel, eylemler üç boyutlu ve dokunmaya davetkâr. Web arayüzünün çerçeve ve sert gölge diline bağlı değildir. Önerilen yığın Kotlin + Jetpack Compose + Material 3 Expressive'dir; kod örnekleri "Android uygulaması" bölümündedir.

### Hedef odaklı yerleşim

- Her ekranın tek ana hedefi vardır ve en büyük, en renkli öğe odur. Bugün ekranında bu "Sıradaki" kartıdır (`NextAppointmentCard`); hemen altında günün kalanı, en altta yüzen araç çubuğu.
- Bir ekranda tek `primary` düğme bulunur. Diğer eylemler `ghost` ya da anlamlı bir pastelle gelir.
- Sık işler en fazla iki dokunuştur: randevu eklemek (araç çubuğunda "Randevu"), randevuyu tamamlamak (satıra dokun, sonra "Tamamla"), başka güne geçmek (gün şeridi).
- Formlar ve onaylar `BottomSheet` içinde açılır; başparmakla ulaşılır, ekran değişmez.

### Renk

- Yüzler pastel, metin her zaman koyu mürekkeptir. Pastel yüz üstünde `on-pastel`, `bg` ve `surface` üstünde `ink` ve `ink-muted` yaz. Pastel üstüne açık renk metin koyma.
- Renk anlam taşır: `primary` ana eylem ve seçim, `positive` bitir ve tamamla, `highlight` ekle ve ertele, `info` planlandı, `caution` yaklaşıyor, `negative` iptal. Süs için başka renk kullanma.
- Her pastelin bir `-lip` tonu vardır; yalnızca alt kalınlık kenarında kullanılır, metin ve ikon rengi olmaz.
- Durum hiçbir zaman yalnızca renkle verilmez: renk, ikon ve sözcük birlikte.
- Koyu tema sistem ayarını izler. Pastel yüzler biraz kısılır, `bg` ve `surface` koyu lacivert olur; `on-pastel` iki temada da aynı koyu mürekkeptir.

### Üç boyutlu yüzey

- Üç boyut bulanık gölgeyle değil, yüzün altındaki düz renkli kenarla (lip) kurulur. Düğmede `lip-button` (5dp), satır, kart ve alanda `lip-card` (4dp).
- Basılı düğme yüzü 4dp aşağı iner, kenarı `lip-pressed` (1dp) olur. Bu, düğmenin "basıldığını" gösteren tek geri bildirimdir; ek dalga (ripple) çizme.
- Compose `elevation` ve gölge kullanma. Yüzen araç çubuğu da düz renklidir.

### Şekil

- Her şey yumuşak: düğme, etiket ve araç çubuğu `radius-full`; satır `radius-md`; Sıradaki kartı ve alt sayfa `radius-lg`; alan `radius-sm`.
- Aynı bileşende iki farklı köşe dili karıştırma.

### Tipografi

- Başlık, düğme, etiket ve müşteri adı `Figtree` (yuvarlak hatlı, rakamları net), gövde sistem `Roboto`. Stiller: `display`, `headline`, `title`, `title-sm`, `label`, `caption`, `body`, `body-strong`, `body-sm`.
- Saat aralığı `body-strong`, rakamlar sabit genişlikli (`tnum`), `14:00–15:00` biçiminde en–tire ile yazılır.
- Metinler `sp` ile yazılır, kullanıcının yazı ölçeğine uyar; 200% ölçekte kartlar sarmalanır, taşmaz.

### Hareket

- Yay (spring) tabanlı, kısa ve anlamlı: düğme basışı 80ms, gün şeridi seçimi ve alt sayfa yaklaşık 250ms. Hareket bir durumu açıklar; süs animasyonu yok.
- Sistem "animasyonları kaldır" ayarındayken yaylar kapanır; durum değişimi anlıktır.
- Başarılı eylemde (tamamla, kaydet) hafif titreşim; hata ve iptalde titreşim yok.

### İçerik ve ton

- Türkçe, sade ve kısa; düğme fiille biter ("Kaydet", "Seansı başlat", "Randevu ekle"). Cümle düzeni, yalnızca ilk harf büyük; emoji yok.
- Hata iki parçadır: ne oldu, ne yapılır ("Doğum tarihini gün.ay.yıl yaz."). Özür ve jargon yok.
- Boş durum davettir: "Bugün için randevu yok", altında "Randevu ekle".

### Erişilebilirlik

- Her etkileşimli öğe en az 48dp. Pastel yüz üstündeki metin 4.5:1'in çok üstündedir (ölçümler Android bölümünde).
- Odak halkası `focus` renginde 3dp ve 3dp boşluklu. TalkBack için ikon-yalnız öğelere `contentDescription`, günlere ve satırlara tam cümle verilir.

## Tokenlar

### Renk

Pastel yüzler, her zaman koyu mürekkep metin. Her pastelin bir 'lip' (kalınlık) tonu vardır; üç boyutlu buton ve kartların alt kenarını çizer. Koyu temada pastel yüzler biraz kısılır ama metin yine on-pastel koyu mürekkeptir.

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `bg` | `#f6f5fc` | `#12132a` | Ekran arka planı. Üzerinde ink, ink-muted, error ve focus kullanılır. |
| `surface` | `#ffffff` | `#1c1e3a` | Satır, kart, alan ve ikincil düğme yüzü. Üzerinde ink, ink-muted, error ve focus kullanılır. |
| `edge` | `#e3e1f3` | `#2b2e55` | surface yüzlü öğelerin alt kalınlık kenarı (satır, ikincil düğme, alan). Süs niteliğindedir; sınır göstermek için outline kullan. |
| `outline` | `#7e81a8` | `#7f83b8` | Metin alanı ve seçim kontrollerinin sınırı. surface ve bg üzerinde en az 3:1. |
| `ink` | `#1f2147` | `#eef0ff` | Ana metin ve ikon: bg ve surface üzerinde. |
| `ink-muted` | `#575a7e` | `#a9acd3` | İkincil metin (saat, not, yardım): bg ve surface üzerinde. |
| `on-pastel` | `#1f2147` | `#1f2147` | Her pastel yüz (primary, positive, highlight, info, caution, negative) üzerindeki metin ve ikon. İki temada da aynı koyu mürekkep. |
| `primary` | `#cfc9ff` | `#b5aeff` | Lavanta. Ana eylem düğmesi, seçili gün ve seçili araç çubuğu öğesi, Sıradaki kart yüzü. Üzerinde on-pastel. |
| `primary-lip` | `#7c72e0` | `#6a60d0` | primary yüzün alt kalınlık kenarı. |
| `positive` | `#bfecd5` | `#8fddb8` | Nane. Tamamla eylemi ve Tamamlandı etiketi. Üzerinde on-pastel. |
| `positive-lip` | `#489a72` | `#4e9e7c` | positive yüzün alt kenarı. |
| `highlight` | `#ffd6c2` | `#ffb99a` | Şeftali. Ekle ve ertele eylemi, avatar yüzü. Üzerinde on-pastel. |
| `highlight-lip` | `#c97753` | `#c2704e` | highlight yüzün alt kenarı. |
| `info` | `#c4e2ff` | `#99cbff` | Gökyüzü. Planlandı etiketi ve bilgi. Üzerinde on-pastel. |
| `info-lip` | `#5890c8` | `#4f86c0` | info yüzün alt kenarı. |
| `caution` | `#fff0b5` | `#f2d677` | Tereyağı. Yaklaşıyor uyarısı. Üzerinde on-pastel. |
| `caution-lip` | `#a68824` | `#ad9234` | caution yüzün alt kenarı. |
| `negative` | `#ffcdd9` | `#ff9fb8` | Gül. İptal eylemi ve İptal etiketi. Üzerinde on-pastel. |
| `negative-lip` | `#cf6d8b` | `#be5e7b` | negative yüzün alt kenarı. |
| `error` | `#b3261e` | `#ff9aa6` | Hata metni (alan altı, form hatası): bg ve surface üzerinde. Her zaman kısa bir cümleyle birlikte. |
| `focus` | `#4b3fd8` | `#cfc9ff` | Odak halkası ve bağlantı metni: bg, surface ve pastel yüzler yanında en az 3:1. |
| `toolbar` | `#1f2147` | `#272a52` | Yüzen araç çubuğunun zemini. Üzerinde toolbar-icon; seçili öğe primary yüzü. |
| `toolbar-icon` | `#cfd0ee` | `#d5d7f5` | Araç çubuğunda seçili olmayan ikonlar. |
| `scrim` | `rgba(31, 33, 71, 0.45)` | `rgba(0, 0, 0, 0.6)` | Alt sayfa arkasındaki karartma. |

### Tipografi

| Stil | Aile | Boyut / satır (sp) | Ağırlık | Kullanım |
|---|---|---|---|---|
| `display` | Figtree | 32px / 40px | 700 | Karşılama başlığı. 1px = 1sp. M3 rolü: displaySmall. |
| `headline` | Figtree | 24px / 32px | 700 | Ekran başlığı. M3 rolü: headlineMedium. |
| `title` | Figtree | 20px / 28px | 700 | Sıradaki kartında müşteri adı, alt sayfa başlığı. M3 rolü: titleLarge. |
| `title-sm` | Figtree | 16px / 24px | 700 | Liste başlığı, satırda müşteri adı. M3 rolü: titleMedium. |
| `label` | Figtree | 16px / 24px | 700 | Düğme metni. M3 rolü: labelLarge. |
| `caption` | Figtree | 12px / 16px | 700 | Durum etiketi ve araç çubuğu etiketi; en küçük boyut. M3 rolü: labelSmall. |
| `body` | Roboto | 16px / 24px | 400 | Gövde metni. M3 rolü: bodyLarge. |
| `body-strong` | Roboto | 16px / 24px | 500 | Saat aralığı (tabular rakam). M3 rolü: bodyLarge, Medium. |
| `body-sm` | Roboto | 14px / 20px | 400 | İkincil açıklama. M3 rolü: bodyMedium. |

### Boşluk

4dp ızgara; px = dp.

| Token | Değer | Kullanım |
|---|---|---|
| `space-1` | `4px` | İkon ile metin arası. |
| `space-2` | `8px` | Satırlar arası, yan yana düğmeler arası. |
| `space-3` | `12px` | Satır iç dolgusu, kart içi boşluk. |
| `space-4` | `16px` | Ekran kenar boşluğu, kart iç dolgusu. |
| `space-5` | `20px` | Bölümler arası. |
| `space-6` | `24px` | Alt sayfa iç dolgusu. |
| `space-7` | `32px` | Boş durum boşluğu. |

### Köşe

Büyük ve yumuşak köşeler; düğmeler tam hap.

| Token | Değer | Kullanım |
|---|---|---|
| `radius-sm` | `14px` | Metin alanı, gün öğesi. |
| `radius-md` | `20px` | Randevu satırı, avatar. |
| `radius-lg` | `28px` | Sıradaki kartı, alt sayfa (üst köşeler). |
| `radius-full` | `999px` | Düğme, etiket, araç çubuğu: hap biçimi. |

### Lip (3B kalınlık)

Üç boyutlu görünüm: yüzün altında düz renkli kalınlık şeridi (dp). Bulanık gölge yok.

| Token | Değer | Kullanım |
|---|---|---|
| `lip-button` | `5px` | Düğme alt kenarı. Basılınca 1dp'ye iner, düğme 4dp aşağı kayar. |
| `lip-card` | `4px` | Satır, kart, alan ve gün öğesi alt kenarı. |
| `lip-pressed` | `1px` | Basılı durumda kalınlık. |

### Boyut

Android boyutları (dp).

| Token | Değer | Kullanım |
|---|---|---|
| `touch-target` | `48px` | Her etkileşimli öğenin en düşük yüksekliği. |
| `icon` | `24px` | Standart ikon. |
| `avatar` | `44px` | Müşteri baş harfi karesi. |
| `toolbar-height` | `64px` | Yüzen araç çubuğu yüksekliği. |
| `day-chip` | `60px` | Gün şeridi öğesi yüksekliği. |

## Bileşenler

### Button

Üç boyutlu hap düğme: pastel yüz, altında aynı tonun koyu "lip" kenarı. Basınca düğme 4dp çöker, kenar 1dp'ye iner.

**Ne sağlarsın:** `text` (fiil: "Kaydet", "Tamamla"), `onClick`, isteğe bağlı `icon` ve `enabled`.

**Anlam tablosu** (renk anlam taşır, süs için kullanma):
- `primary` (lavanta): ekranın ana eylemi. Ekranda tek tane.
- `positive` (nane): bir şeyi bitirir ("Tamamla", "Seansı başlat").
- `highlight` (şeftali): ekler ya da erteler ("Randevu", "Ertele").
- `negative` (gül): geri alınması zor eylem ("İptal et"). Yanında her zaman onay adımı olur.
- `ghost` (`surface` yüz, `edge` kenar): ikincil eylem ("Vazgeç", "Notlar").

**Biçim:** en az `touch-target` (48dp) yükseklik, `radius-full`, metin `label` ve renk `on-pastel`, kalınlık `lip-button`. Küçük boyut 40dp yüksekliktedir ve yalnızca satır içi eylemde kullanılır. Çevrede 48dp'lik dokunma alanı korunur.

**Hareket:** basılınca yay (spring) animasyonuyla 4dp iner, bırakınca geri sıçrar; hafif titreşim (`HapticFeedbackType.TextHandleMove`). Basılı süre 80ms'den uzun sürmez.

**Kullan:** iki düğme yan yana ise eşit genişlikte ve `space-2` aralıklı; asıl eylem sağda. Odak halkası `focus` renginde 3dp, 3dp boşlukla.

**Kullanma:** aynı ekranda iki `primary`; düğme üzerinde bulanık gölge; devre dışı düğmeyle eylemi gizleme (tıklanınca nedenini söyle).

### TextField

Etiketi üstte duran tek satırlık alan; `surface` yüzlü, alt kenarı kalın.

**Ne sağlarsın:** `label`, `value`, `onValueChange`, isteğe bağlı `error: String?` ve `supportingText`.

**Biçim:** etiket 14sp Figtree kalın; alan en az 48dp, `radius-sm`, 1.5dp `outline` çerçeve (surface üzerinde 3:1), altta `lip-card` kalınlığında `edge` kenar. Odakta `focus` renginde 3dp halka. Yer tutucu `ink-muted`.

**Kullan:**
- Etiket her zaman alanın üstündedir ve kaybolmaz.
- Hata, çerçeveyi `error` yapar ve altına ne olduğunu ve ne yapılacağını söyleyen tek cümle yazılır ("Doğum tarihini gün.ay.yıl yaz."). Hata yalnızca renkle verilmez.
- Klavye türünü alana uydur ve `ImeAction.Next` ile ilerlet.

**Kullanma:** kayan etiket animasyonu; ikonla dolu alan; alan içine etiket gömme.

### StatusChip

Randevu durumunu söyleyen hap etiket: Planlandı (`info`, saat ikonu), Tamamlandı (`positive`, tik), İptal (`negative`, çarpı), Yaklaşıyor (`caution`, zil).

**Biçim:** 28dp yükseklik, `radius-full`, metin `caption`, renk `on-pastel`, ikon 16dp.

**Kullan:** durum üç şekilde birlikte verilir: renk, ikon ve sözcük. Biri eksik olursa renk körlüğü ve TalkBack kullanıcıları durumu kaçırır. "Yaklaşıyor" yalnızca başlangıca 60 dakika ya da daha az kalmış planlı randevuda görünür.

**Kullanma:** beşinci bir durum rengi; etiket üstünde ayrı bir düğme.

### NextAppointmentCard

Bugün ekranının tepesindeki büyük kart: uzmanın şimdi yapması gereken tek şeyi gösterir.

**Ne sağlarsın:** sıradaki `Appointment`, `onStart`, `onOpenNotes`. Sıradaki yoksa kart yerine boş durum gösterilir ("Bugün için randevu yok", altında `highlight` "Randevu ekle" düğmesi).

**Biçim:** `primary` yüz, `radius-lg`, altta `lip-button` kalınlığında `primary-lip` kenar, iç dolgu `space-4`. Üstte kalan süre hapı (beyaz zemin, koyu metin) ve "Sıradaki" yazısı. Ortada müşteri adı (`title`) ve saat aralığı (`body-sm`). Altta ikincil "Notlar" ve `positive` "Seansı başlat".

**Davranış:** kalan süre dakikada bir güncellenir; başlangıca 15 dakika kala hap `caution` rengine döner. "Notlar" önceki seansların notlarını alt sayfada açar. Seans başlayınca kart "Seans sürüyor" durumuna geçer ve tek eylem "Tamamla" olur.

**Kullanma:** ekranda ikinci bir büyük kart; kart içine ikiden fazla düğme.

### AppointmentRow

Günün listesindeki tek satır: baş harf karesi, müşteri adı, saat aralığı ve durum etiketi. Tüm satır tek dokunma hedefidir.

**Ne sağlarsın:** `Appointment`, `onClick`, `onToggleDone`.

**Biçim:** `surface` yüz, `radius-md`, altta `lip-card` kalınlığında `edge` kenar; iç dolgu `space-3`. Baş harf karesi 44dp, `radius-sm`; rengi müşteriden türetilir ve `highlight`, `info`, `primary`, `positive`, `caution`, `negative` arasından seçilir (aynı müşteri hep aynı rengi alır). Ad `title-sm`, saat `body-strong` ve `ink-muted`, rakamlar tabular.

**Davranış:** dokunmak satırı açar; satırı sağa uzun basmak "Tamamla" kısayolunu çıkarır. Tamamlanan satırda ad üstü çizilir ve etiket Tamamlandı olur. İptal edilen satır %70 opaklıkta kalır.

**Kullan:** satırlar arası `space-2`. Boş saat aralıklarını ayrı satır olarak gösterme; gün şeridindeki nokta yoğunluğu anlatır.

**Kullanma:** kaydırarak silme; satır içine eylem düğmesi koyma (eylemler alt sayfada).

### DayStrip

Yatay gün şeridi: Hafta ve Ay ekranlarına gitmeden günler arasında geçmenin en kısa yolu.

**Ne sağlarsın:** `selectedDate`, `onSelect`, her gün için randevu sayısı (nokta göstermek için). Hafta Pazartesi başlar.

**Biçim:** her gün 60dp yüksekliğinde, `surface` yüz ve `lip-card` kalınlığında `edge` kenar; seçili gün `primary` yüz ve `primary-lip` kenar. Üstte gün kısaltması (12sp), altta gün numarası (`label`). Randevusu olan günün altında 6dp nokta durur.

**Kullan:** şerit sağa ve sola kaydırınca hafta değişir; seçim `selectedDate`'i değiştirir ve altındaki liste yumuşakça güncellenir. TalkBack her gün için "Salı 24 Kasım, 5 randevu" okur.

**Kullanma:** şeritte ay adı ya da yıl; başka bir tarih seçici. Uzak tarihe gitmek için Hafta/Ay ekranı vardır.

### FloatingToolbar

Ekranın altında yüzen koyu hap çubuk: iki sekme, ortada ana eylem, iki sekme. Klasik alt gezinme çubuğunun ve FAB'ın yerini tek öğede alır.

**Ne sağlarsın:** hedefler (Bugün, Hafta, Müşteriler, Daha fazla), `selected`, `onSelect` ve ortadaki eylem ("Randevu", `onAdd`). Ay ve Randevular listesi "Daha fazla" menüsündedir.

**Biçim:** `toolbar-height` (64dp), `radius-full`, `toolbar` zemini; ekran kenarından `space-4`, alttan sistem çubuğu boşluğu + `space-2` içeride yüzer. Seçili sekme `primary` daire ve `on-pastel` ikon; diğerleri `toolbar-icon`. Ortadaki düğme `highlight` 3B düğmedir.

**Davranış:** liste aşağı kaydırılınca çubuk küçülür ve yalnızca ana eylem düğmesini bırakır; yukarı kaydırınca geri açılır (yay animasyonu). Her hedef 48dp dokunma alanı taşır; ikonlara `contentDescription` verilir.

**Kullan:** en fazla dört hedef ve bir eylem. Altıncı ekran gerekirse "Daha fazla" menüsüne ekle.

**Kullanma:** etiketli alt çubuk (bu çubukta etiket yoktur; ikonlar TalkBack ile okunur); iki ayrı eylem düğmesi.

### AssistantBar

Doğal dil komut çubuğu: tek cümleyle randevu taslağı açar.

**Android eklemesi:** web'de henüz yok; `docs/superpowers/specs/2026-11-12-ritma-ai-assistant-and-reminders-design.md` tasarımındaki asistanı karşılar. O tasarım onaylanana kadar yalnızca görünüm belirtilir.

**Ne sağlarsın:** `value`, `onSubmit`, `loading`, `error`.

**Biçim:** `surface` yüz, `radius-lg`, alt `lip-card` kenar. Solda `primary-lip` renginde parıltı ikonu, ortada alan, sağda küçük `primary` "Oluştur" düğmesi. Yer tutucu gerçek bir örnektir: "Yarın 10:00 Zeynep Kaya kontrol".

**Kullan:** komut randevuyu doğrudan kaydetmez; sonuç her zaman alanları dolu bir alt sayfa (randevu formu) olarak açılır. Yüklenirken düğme "Hazırlanıyor…" yazar. Hata `error` renginde kısa bir cümledir.

**Kullanma:** sohbet balonu, çok adımlı konuşma, sesli giriş.

### BottomSheet

Ekranın altından çıkan sayfa: randevu ve müşteri formları, onaylar, notlar. Ortada duran dialogun yerini alır; başparmakla ulaşılır.

**Ne sağlarsın:** `title`, gövde (form ya da metin), eylem düğmeleri, `onDismiss`.

**Biçim:** `surface` yüz, üst köşeler `radius-lg`, iç dolgu `space-6`, tutamak 36×4dp `outline` renginde, arkada `scrim`. Başlık `title`. Eylemler en altta, eşit genişlikte: solda `ghost` "Vazgeç", sağda asıl eylem (`primary` ya da `negative`).

**Davranış:** aşağı çekerek ya da geri tuşuyla kapanır; form doluysa kapatmadan önce "Değişiklikler silinsin mi?" sorulur. Klavye açılınca sayfa klavyenin üstüne yapışır ve eylem düğmeleri görünür kalır.

**Kullan:** başlıkta eylemi söyle ("Randevuyu iptal et"), gövdede sonucunu yaz. Geri alınamayan eylemde `negative` düğme kullan.

**Kullanma:** sayfa üstüne ikinci sayfa; tam ekran sayfa gerektiren akışı sayfaya sığdırma (ayrı ekran yap).

## Android uygulaması

Bu bölüm tokenları Kotlin + Jetpack Compose koduna çevirir. Yığın bir ÖNERİDİR. .NET MAUI ya da React Native seçilirse tokenlar aynı kalır, yalnızca kod bölümü değişir.

### Mimari

- Tek modül: `:core:designsystem`. İçinde `RitmaTheme`, tokenlar ve bileşenler bulunur; uygulama modülleri yalnızca `RitmaTheme { … }` ve `Ritma*` bileşenlerini görür.
- Material 3 iskelet olarak kalır (`Scaffold`, sheet ve toolbar davranışları); renk, şekil ve tipografi `RitmaTheme` içinde ezilir. Bileşenler `RitmaTheme.colors` okur, böylece token adları belgedekiyle bire bir aynıdır.
- Material 3 Expressive API'leri (yay hareket şeması, floating toolbar, button group) sürümden sürüme değişir. Sürümü kilitle ve kullanmadan önce güncel dokümana bak.
- Birim: tokenlardaki `px`, Android'de `dp` (boyut, boşluk) ya da `sp` (yazı).

### Renk

```kotlin
@Immutable
class RitmaColors(
    val bg: Color, val surface: Color, val edge: Color, val outline: Color,
    val ink: Color, val inkMuted: Color, val onPastel: Color,
    val primary: Color, val primaryLip: Color,
    val positive: Color, val positiveLip: Color,
    val highlight: Color, val highlightLip: Color,
    val info: Color, val infoLip: Color,
    val caution: Color, val cautionLip: Color,
    val negative: Color, val negativeLip: Color,
    val error: Color, val focus: Color,
    val toolbar: Color, val toolbarIcon: Color, val scrim: Color,
)

val LightColors = RitmaColors(
    bg = Color(0xFFF6F5FC), surface = Color(0xFFFFFFFF), edge = Color(0xFFE3E1F3), outline = Color(0xFF7E81A8),
    ink = Color(0xFF1F2147), inkMuted = Color(0xFF575A7E), onPastel = Color(0xFF1F2147),
    primary = Color(0xFFCFC9FF), primaryLip = Color(0xFF7C72E0),
    positive = Color(0xFFBFECD5), positiveLip = Color(0xFF489A72),
    highlight = Color(0xFFFFD6C2), highlightLip = Color(0xFFC97753),
    info = Color(0xFFC4E2FF), infoLip = Color(0xFF5890C8),
    caution = Color(0xFFFFF0B5), cautionLip = Color(0xFFA68824),
    negative = Color(0xFFFFCDD9), negativeLip = Color(0xFFCF6D8B),
    error = Color(0xFFB3261E), focus = Color(0xFF4B3FD8),
    toolbar = Color(0xFF1F2147), toolbarIcon = Color(0xFFCFD0EE), scrim = Color(0x731F2147),
)
```

Koyu palet `tokens.json` içindeki `dark` değerleridir. `RitmaTheme` içinde `isSystemInDarkTheme()` ile seçilir. Dinamik renk (Material You duvar kâğıdı renkleri) kullanılmaz; marka paleti sabittir.

### Üç boyutlu yüzey

```kotlin
@Composable
fun RitmaButton(text: String, onClick: () -> Unit, tone: Tone = Tone.Primary, modifier: Modifier = Modifier) {
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val dy by animateDpAsState(if (pressed) 4.dp else 0.dp, spring(dampingRatio = 0.55f, stiffness = 900f))
    val face = tone.face(RitmaTheme.colors); val lip = tone.lip(RitmaTheme.colors)
    Box(modifier.heightIn(min = 48.dp).clickable(src, null, role = Role.Button, onClick = onClick)) {
        Box(Modifier.matchParentSize().offset(y = 0.dp).background(lip, CircleShape))          // alt kenar sabit
        Box(Modifier.offset(y = dy - 5.dp).background(face, CircleShape).padding(horizontal = 20.dp, vertical = 12.dp)) {
            Text(text, style = RitmaTheme.type.label, color = RitmaTheme.colors.onPastel)
        }
    }
}
```

Kart ve satırlarda aynı fikir `Modifier.lip(color, 4.dp, shape)` ile yazılır: şeklin 4dp aşağıya kaydırılmış kopyası yüzün arkasına çizilir (`drawBehind`). Kapsayıcıya `padding(bottom = 4.dp)` ver ki kenar kırpılmasın. Gölge ve `elevation` kullanılmaz.

### Tipografi

`Figtree` Google Fonts'tan **downloadable fonts** ile alınır (`GoogleFont.Provider`); `.ttf` dosyasını repoya eklemek gerekmez, ama ilk açılışta yedek olarak `FontFamily.SansSerif` tanımlı olmalıdır. Gövde `Roboto` (sistem varsayılanı).

```kotlin
val Head = FontFamily(Font(GoogleFont("Figtree"), provider, FontWeight.Bold))
val RitmaTypography = Typography(
    displaySmall = TextStyle(fontFamily = Head, fontSize = 32.sp, lineHeight = 40.sp),
    headlineMedium = TextStyle(fontFamily = Head, fontSize = 24.sp, lineHeight = 32.sp),
    titleLarge = TextStyle(fontFamily = Head, fontSize = 20.sp, lineHeight = 28.sp),
    labelLarge = TextStyle(fontFamily = Head, fontSize = 16.sp, lineHeight = 24.sp),
    labelSmall = TextStyle(fontFamily = Head, fontSize = 12.sp, lineHeight = 16.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
)
```

Saat metinlerinde `fontFeatureSettings = "tnum"`.

### Hareket

`MotionScheme.expressive()` kullanılır. Düğme basışı: `spring(dampingRatio = 0.55f, stiffness = 900f)`. Alt sayfa ve gün şeridi: M3 expressive varsayılanı. `Settings.Global.ANIMATOR_DURATION_SCALE == 0` ise yaylar yerine `snap()` kullan.

### Kontrast ölçümleri (WCAG 2)

Metin çiftleri en az 4.5:1, kontrol sınırı ve odak halkası en az 3:1 hedeflendi ve iki temada ölçüldü.
- `ink` ve `ink-muted`: `bg` ve `surface` üstünde açık temada 6.1 ve üzeri, koyu temada 7.3 ve üzeri.
- `on-pastel`: altı pastel yüzün hepsinde açık temada 9.8 ve üzeri, koyu temada 7.6 ve üzeri.
- `outline`, `bg` ve `surface` üstünde 3.4 ve üzeri.
- Her `-lip` tonu açık temada `bg` üstünde 3:1 ve üzeri. Lip süstür, düğme etiketi zaten 4.5'in üzerindedir.
- Bilinen sınır: koyu temada `focus`, `primary` yüzün hemen üstünde 3:1'in altında kalır. Bu yüzden halka her zaman 3dp boşlukla çizilir ve zemin `bg` olur.

### Karar bekleyen konular (müdahale et)

1. **Başlık yazı tipi:** `Figtree` önerildi (yuvarlak, net rakam). Alternatif: `Nunito` (daha yumuşak) ya da yalnız `Roboto` (ek yazı tipi yok).
2. **Yüzen araç çubuğu:** Bugün, Hafta, ortada Randevu, Müşteriler, Daha fazla. Ay ve Randevular listesi "Daha fazla" menüsünde. Klasik etiketli alt çubuk tercih edilirse `FloatingToolbar` değişir.
3. **Müşteri baş harf rengi:** altı pastelden müşteri kimliğiyle sabit seçiliyor. Tek renk istenirse `info`'ya sabitle.
4. **Dinamik renk:** kapalı. Açılırsa marka paleti Material You ile karışır.
5. **AI asistan çubuğu:** yalnız görünüm belirtildi; özellik tasarımı henüz onaylanmadı.
6. **Titreşim:** başarılı eylemde açık. Kapatmak için tek satır.

# Ritma'yı Render'da Ücretsiz Yayına Alma Rehberi

Bu rehber, Ritma'yı Render'ın ücretsiz planında `https://<ad>.onrender.com` adresinde yayına almanın ve Render MCP ile Claude Code'dan yönetmenin adımlarını anlatır. Hesap oluşturmaktan başlar.

> Rehber 2026-11-05'te Render'ın resmi dokümanlarından ve bu reponun koduna bakılarak yazıldı. Render arayüzü ve ücretsiz plan limitleri değişebilir. Bir ekran burada yazanla uyuşmazsa Render'ın güncel dokümanına bakın. Doğrulayamadığım yerleri **(Doğrula)** diye işaretledim.

## 0. Ne kuruyoruz?

- **Tek servis:** Express backend, derlenmiş ön yüzü (`frontend/dist`) kendisi servis eder. Ayrı bir ön yüz barındırmaya gerek yok.
- **Veritabanı:** Mevcut Neon PostgreSQL. Render'ın kendi ücretsiz Postgres'i **kullanılmaz** (30 gün sonra süresi doluyor).
- **Kod kaynağı:** GitHub reposu `turkayurkmez/ritma-for-individual`. Render, bu repodan `main` branch'ini çekip yayınlar.

Kod tarafında bilmeniz gerekenler:

| Konu | Durum |
| --- | --- |
| Port | `PORT` ortam değişkenini okur (`backend/src/config.ts`). Render bunu kendisi verir. Elle ayarlamayın. |
| Sağlık kontrolü | `GET /api/v1/health` → `{"status":"ok"}` |
| Demo hesaplar | `NODE_ENV=production` iken **varsayılan kapalı**. Test için `DEMO_ACCOUNTS_ENABLED=true` gerekir. |
| Swagger (`/docs`) | `NODE_ENV=production` iken kapalı. Yayında açılmaz. |
| Migration | Sunucu açılırken **çalışmaz**. Şema değişikliği `npm run db:migrate` ile elle uygulanır. |
| Çerez | Üretimde `Secure` işaretli. Render HTTPS verdiği için çalışır. |

## 1. Render hesabı oluşturma

1. <https://render.com> adresine gidin, **Get Started** ya da **Sign Up**'a tıklayın.
2. **GitHub ile kaydolmanızı öneririm.** Hem hesap açılır hem repo bağlantısı kolaylaşır. E-posta ile de kaydolabilirsiniz, GitHub'ı sonra bağlarsınız (Adım 3).
3. E-postanızı doğrulayın ve karşılama sorularını geçin.
4. Kayıtta bir **workspace** oluşur. MCP de bu workspace içinde çalışır.

Ücretsiz web servis için kredi kartı gerekmiyor gibi görünüyor **(Doğrula)**. Ama kart girmezseniz limit aşıldığında servisler ay sonuna kadar askıya alınır (Adım 9).

## 2. Neon'da test branch'i hazırlama (önerilir)

Yayındaki test ortamı gerçek verinize dokunmasın diye ayrı bir veritabanı kullanın. Demo hesaplar açıkken sunucu her başlangıçta demo kullanıcıları `users` tablosuna ekler. Bunu gerçek verinizin olduğu branch'te yapmak istemezsiniz.

1. Neon panelinde projenizi açın, **Branches** → yeni bir branch oluşturun (örnek ad: `render-test`).
2. Bu branch için **Connect** ekranından bağlantı adresini kopyalayın. Havuzlu (`-pooler`) adres uygundur. Sonunda `?sslmode=verify-full` olsun.
3. Bilgisayarınızda şemayı bu branch'e uygulayın. `backend/.env` dosyasındaki `DATABASE_URL`'i geçici olarak bu adresle değiştirip şunları çalıştırın:
   ```
   cd backend
   npm run db:check
   npm run db:migrate
   ```
   `Uygulanan migration'lar: 001_init.sql` benzeri bir çıktı görmelisiniz. Sonra `.env`'i eski değerine döndürün.
4. Adresi kimseyle paylaşmayın, sohbete yapıştırmayın. Render'a yalnızca Adım 5'te panelden gireceksiniz.

> Neon branch'ini ana branch'ten kopyalarsanız şema zaten gelir. O zaman `db:migrate` "Yeni migration yok" der, sorun değil.

## 3. GitHub'ı Render'a bağlama

GitHub ile kaydolduysanız bu adım büyük ölçüde hazırdır.

1. Render panelinde **Account Settings** → **Account Security** → **Git Deployment Credentials** → **Add credential** → **GitHub**.
2. GitHub yetkilendirme ekranında onaylayın.
3. Render'ın hangi repolara erişeceğini sınırlamak için <https://github.com/apps/render/installations/new> adresine gidip **Repository access** bölümünde yalnızca `ritma-for-individual` reposunu seçin. Tüm repolara erişim vermek zorunda değilsiniz.

Servis oluştururken repo listede görünmüyorsa sebep neredeyse her zaman bu repo erişim ayarıdır.

## 4. Kodu yayına hazırlama

Render, GitHub'daki kodu çeker. Bu yüzden Render'ın ihtiyaç duyduğu her şey `main`'de olmalıdır.

- Şu an için **kodda değişiklik gerekmiyor.** Aşağıdaki build/start komutları mevcut kodla çalışır.
- Repoda Render'a özel bir dosya (`render.yaml` gibi) yok. Servisi panelden elle kuracağız (Adım 5). Dilerseniz sonradan `render.yaml` eklenebilir (Ek A).
- Değişiklik gerekirse `CLAUDE.md` kuralı gereği ayrı bir `feat/...` branch'inde yapılır ve PR ile `main`'e girer.

## 5. Web servisini oluşturma

1. Render panelinde **New** → **Web Service**.
2. **Git Provider** seçin, `ritma-for-individual` reposunu seçin.
3. Formu doldurun:

| Alan | Değer |
| --- | --- |
| **Name** | `ritma-test` (adres `ritma-test.onrender.com` olur. Doluysa Render sonek ekleyebilir.) |
| **Region** | Neon projenizin bölgesine yakın olanı seçin (gecikme için). |
| **Branch** | `main` |
| **Root Directory** | Boş bırakın (repo kökü). Sunucu `../../frontend/dist` yoluna bakar, kökten çalışmalı. |
| **Language / Runtime** | Node |
| **Build Command** | `cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci --include=dev && npm run build` |
| **Start Command** | `cd backend && npm start` |
| **Instance Type** | **Free** |

   `--include=dev` önemli: build ortamında `NODE_ENV=production` olursa `npm ci` devDependencies'i (TypeScript, Vite, `@types/*`) atlar ve build "tsc bulunamadı" gibi bir hatayla çöker. Bu bayrak o riski ortadan kaldırır. **İki** `npm ci`'de de (hem `frontend` hem `backend`) olmalı. İlk denemede yalnızca backend'dekini yazmıştık, ön yüz build'i `Cannot find type definition file for 'vite/client'` hatasıyla çöktü (Render ön yüzde yalnızca 9 paket kurdu).

4. **Advanced** bölümünü açın:
   - **Health Check Path:** `/api/v1/health`
   - **Auto-Deploy:** Açık kalsın (`main`'e her merge'de yeniden yayınlar).
   - **Environment Variables:** Adım 6.

5. **Create Web Service**'e basmadan önce Adım 6'yı doldurun, sonra oluşturun.

## 6. Ortam değişkenleri

Advanced → Environment Variables bölümüne ekleyin:

| Anahtar | Değer | Not |
| --- | --- | --- |
| `NODE_ENV` | `production` | Çerezleri `Secure` yapar, `/docs`'u kapatır. |
| `DATABASE_URL` | Adım 2'deki Neon test branch adresi | **Gizli.** Yalnızca panele yazın. |
| `DEMO_ACCOUNTS_ENABLED` | `true` | Aksi halde giriş yapacak hesap olmaz. Bkz. aşağıdaki uyarı. |
| `NODE_VERSION` | `24` | Sürümü sabitler. Backend yeni Node özelliklerini kullanıyor (`import.meta.dirname`, `--env-file-if-exists`). Render yeni servislerde zaten Node 24 verir ama sabitlemek sürprizi önler. |

**Elle `PORT` eklemeyin.** Render verir, kod okur.

> **Uyarı:** `DEMO_ACCOUNTS_ENABLED=true` iken herkesin bildiği demo parolalarla (`ayse@ritma.demo` / `demo-ayse-123`) giriş yapılabilir. Bu bir **test ortamı** için kabul edilebilir. Adresi herkese açık paylaşmayın. Test bitince Adım 10'daki gibi kapatın ya da servisi askıya alın. Gerçek kullanıcılara açmadan önce gerçek bir kimlik sağlayıcı gerekir. Bugün onsuz demo kapalıyken kimse giriş yapamaz.

## 7. İlk yayını izleme ve doğrulama

1. **Create Web Service**'ten sonra **Deploys** / **Logs** sekmesinde build'i izleyin. İlk build birkaç dakika sürer.
2. Başarılıysa logda şu satırı görürsünüz: `Ritma http://localhost:<port> adresinde çalışıyor` (adresteki `localhost` yazısı normaldir, Render dışarıya kendi adresini verir).
3. Servis **Live** olunca doğrulayın:
   ```
   curl https://ritma-test.onrender.com/api/v1/health
   ```
   Beklenen: `{"status":"ok"}`
4. Tarayıcıda `https://ritma-test.onrender.com/` açın. Tanıtım sayfası gelmeli.
5. `/giris` sayfasından demo hesapla girin (`ayse@ritma.demo` / `demo-ayse-123`). Randevu ve müşteri ekleyip sayfayı yenileyerek verinin kaldığını görün.
6. Telefon genişliğinde de bakın (tarayıcı geliştirici araçlarından).
7. Neon panelinde **Tables** ya da SQL Editor'da `sessions` ve `users` tablolarında satır oluştuğunu doğrulayın. Veri Neon'da değilse sunucu belleğe düşmüş demektir (sunucu bu durumda `DATABASE_URL` tanımlıyken açıklayıcı hatayla kapanır, ama emin olun).

**Beklenen davranış:** 15 dakika istek gelmezse servis uyur. Sonraki ilk istek yaklaşık 1 dakika sürer, bu bir hata değildir.

## 8. Render MCP: ne işe yarar?

MCP (Model Context Protocol), Claude Code'un dış araçlara bağlanma yoludur. Render MCP ile Claude Code'dan doğal dille şunları yapabilirsiniz:

- Workspace ve servisleri listelemek, ayrıntılarını görmek.
- Web servisi, statik site, cron job, Postgres, Key Value **oluşturmak**.
- Bir servisin **ortam değişkenlerini güncellemek**.
- Deploy tetiklemek (istenirse build önbelleğini temizleyerek), deploy geçmişini görmek.
- **Log okumak** (örn. "son hata loglarını getir").
- Servis olaylarını görmek (deploy hatası, bellek yetersizliği, başarısız sağlık kontrolü).
- CPU, bellek, bant genişliği gibi metrikleri okumak.
- Render Postgres'e salt okunur SQL sorgusu atmak.

**Yapamadıkları / sınırları:**

- Mevcut bir web servisinin ayarlarını (build komutu, plan vb.) doğrudan **güncelleyemez**. Bunun için size panel bağlantısı verir.
- Servisleri **silemez**, ölçeklendirme ayarlarını değiştiremez. Bunlar panelden yapılır.
- Docker imajından servis oluşturamaz.
- Servis oluştururken build ve start komutu zorunludur.
- Yanıt süresi metrikleri Pro workspace ister.
- Neon veritabanına bağlanmaz. SQL aracı yalnızca Render Postgres içindir. Neon'u kontrol etmek için Neon panelini kullanın.
- **Ücretsiz planda servis oluşturma** MCP dokümanında açıkça anlatılmıyor **(Doğrula)**. Güvenli yol, servisi Adım 5'teki gibi panelden kurmak, MCP'yi log/deploy/env işleri için kullanmaktır.

**Güvenlik:**

- MCP, deploy tetikleme ve ortam değişkeni değiştirme gibi **yıkıcı olabilecek** işlemlere izin verir. Bağlandığınızda Claude, workspace'inizdeki servislere erişir.
- Render, bağlantı adresleri gibi gizli verileri yapay zekâ bağlamından uzak tutmaya çalışır ama **garanti vermez**. Gizli değerleri yine de sohbete yazmayın.
- Mümkünse yalnızca bu test için ayrılmış bir workspace/hesap kullanın.

## 9. Render MCP'yi Claude Code'a bağlama

İki yol var. **Önce 9.1'i deneyin.**

### 9.1 Plugin ile (Render'ın önerdiği yol)

Claude Code içinde şunu yazın:

```
/plugin install render@claude-plugins-official
```

Kapsam (scope) seçmeniz istenir (yalnızca bu proje mi, tüm projeleriniz mi). Sonra:

```
/reload-plugins
```

İlk kullanımda tarayıcı açılır ve Render hesabınızla yetkilendirme yaparsınız. Plugin ayrıca Render'a özel yetenekler (skill) de ekler. API anahtarı oluşturmanız gerekmez.

### 9.2 API anahtarı ile (etkileşimsiz ortamlar için)

1. Anahtarı oluşturun: <https://dashboard.render.com/u/settings?add-api-key> (Account Settings → API Keys). Kopyalayın.
2. **Normal bir terminalde** (sohbete yazmadan) çalıştırın:
   ```
   claude mcp add --transport http render https://mcp.render.com/mcp --header "Authorization: Bearer <API_ANAHTARINIZ>"
   ```
   İsterseniz `--scope` bayrağıyla yapılandırmanın nerede saklanacağını seçebilirsiniz. Anahtar bir dosyada saklanır. O dosyayı git'e koymayın.
3. Claude Code'u yeniden başlatın. Bağlantıyı `claude mcp list` ya da oturum içinde `/mcp` ile kontrol edin.

> API anahtarı hesabınızdaki **tüm workspace'lere** erişir. İşiniz bitince panelden anahtarı silin.

Sorun olursa: bağlantı "failed" görünüyorsa anahtarı yeniden oluşturun, komutta tırnakları ve `Bearer ` sonrasındaki boşluğu kontrol edin.

## 10. MCP ile günlük kullanım

Bağlandıktan sonra, önce workspace'i seçin:

> Render workspace'imi [WORKSPACE_ADI] olarak ayarla

Sonra örnek istekler:

- "ritma-test servisinin son deploy durumunu göster."
- "ritma-test için son 50 hata loglarını getir."
- "ritma-test'i build önbelleğini temizleyerek yeniden deploy et."
- "ritma-test'in `DEMO_ACCOUNTS_ENABLED` değerini `false` yap." (Dikkat: bu komut **tüm** ortam değişkenlerini güncelleyen bir araçla yapılır. Claude'dan mevcut listeyi önce göstermesini ve onayınızı almasını isteyin, yoksa unutulan bir değişken silinebilir. **Doğrula**)
- "ritma-test'in bellek ve CPU kullanımını son bir saat için göster."

Deploy tetikleme ve env değiştirme gibi işlemlerden önce Claude'un size sorması için izin ayarlarını (permission) sıkı tutun.

## 11. Sık karşılaşılan sorunlar

| Belirti | Olası neden / çözüm |
| --- | --- |
| Build: `tsc: not found` / `vite: not found` / `Cannot find type definition file for 'vite/client'` | devDependencies kurulmadı. Build komutundaki **iki** `npm ci`'nin de `--include=dev` içerdiğinden emin olun. |
| Build: `Cannot find module` / tip hatası | Yerelde `cd backend && npm run build` ve `cd frontend && npm run build` çalıştırıp aynı hatayı üretin. |
| Deploy "no open port detected" | Sunucu `PORT`'u okuyor, bu beklenmez. Start komutunun `cd backend && npm start` olduğunu ve loglarda sunucunun hata ile kapanmadığını kontrol edin. |
| Sunucu açılırken kapanıyor, logda bağlantı hatası | `DATABASE_URL` yanlış ya da Neon uyku modunda. Adresi ve `sslmode` değerini kontrol edin. Sunucu bilerek belleğe düşmez, kapanır. |
| Giriş yapılamıyor | `DEMO_ACCOUNTS_ENABLED=true` eksik. Değişkeni ekleyip yeniden deploy edin. |
| Tanıtım sayfası 404 / boş | Ön yüz build'i çalışmadı ya da Root Directory dolu. Root boş olmalı, build komutu `frontend`'i derlemeli. |
| `/docs` açılmıyor | Bilerek kapalı (`NODE_ENV=production`). |
| İlk açılış çok yavaş | Ücretsiz plan uyku modundan uyanıyor (~1 dk). Normal. |
| Tablo yok hatası (`relation ... does not exist`) | Neon branch'ine migration uygulanmadı. Adım 2.3'ü yapın. |
| Servis ay ortasında askıya alındı | Ücretsiz saat/bant genişliği/build dakikası bitti. Aşağıya bakın. |

## 12. Ücretsiz plan limitleri (Render dokümanından)

- **Uyku:** 15 dakika istek gelmezse uyur, sonraki istekle ~1 dakikada uyanır.
- **Saat:** Workspace başına ayda 750 ücretsiz instance saati. Biterse tüm ücretsiz web servisler ay sonuna kadar askıya alınır. Uyuyan servis saat harcamaz.
- **Bant genişliği ve build dakikası:** Aylık dahil kotalar var. Ödeme yöntemi eklemediyseniz aşımda servisler askıya alınır ya da yeni build'ler kapanır.
- **Disk:** Kalıcı disk yok. Dosyalar her deploy/yeniden başlatmada silinir. Ritma veriyi Neon'da tuttuğu için sorun değil.
- **Tek instance**, ölçekleme yok. Render servisi istediği zaman yeniden başlatabilir.
- **Giden e-posta portları (25, 465, 587)** kapalı. Ritma şu an e-posta göndermiyor, ileride gerekirse not edin.

## 13. İşiniz bitince

1. Demo hesaplarla yayını herkese açık bırakmayın. `DEMO_ACCOUNTS_ENABLED`'i `false` yapın ya da servisi askıya alın (panel → servis → **Suspend Service**).
2. MCP için oluşturduğunuz API anahtarını panelden silin (9.2 kullandıysanız). Plugin kullandıysanız yetkilendirmeyi Render hesap ayarlarından kaldırabilirsiniz.
3. Neon `render-test` branch'ini artık gerekmiyorsa silin.
4. Servisi tamamen silmek için panel kullanın (MCP silemez): servis → **Settings** → en altta **Delete Web Service**.

## Ek A: İsteğe bağlı `render.yaml` (Blueprint)

Aynı kurulumu koda dökmek isterseniz repo köküne `render.yaml` eklenebilir. Bu, ayrı bir `feat/...` branch'inde yapılacak bir değişikliktir:

```yaml
services:
  - type: web
    name: ritma-test
    runtime: node
    plan: free
    buildCommand: cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci --include=dev && npm run build
    startCommand: cd backend && npm start
    healthCheckPath: /api/v1/health
    autoDeployTrigger: commit
    envVars:
      - key: NODE_ENV
        value: production
      - key: DEMO_ACCOUNTS_ENABLED
        value: "true"
      - key: NODE_VERSION
        value: "24"
      - key: DATABASE_URL
        sync: false
```

`sync: false`, `DATABASE_URL`'in değerini ilk kurulumda sizden panelden ister, dosyada tutmaz. Blueprint ile kurulum için panelde **New** → **Blueprint** yolunu izlersiniz. Bu rehberin ana yolu (Adım 5) panelden elle kurulumdur. İkisini birden yapmayın, yoksa iki ayrı servis oluşur.

## Kaynaklar

- Render ücretsiz plan: <https://render.com/docs/free>
- Web servisleri: <https://render.com/docs/web-services>
- Node sürümü: <https://render.com/docs/node-version>
- GitHub bağlantısı: <https://render.com/docs/github>
- Blueprint dosyası: <https://render.com/docs/blueprint-spec>
- Render MCP sunucusu: <https://render.com/docs/mcp-server>

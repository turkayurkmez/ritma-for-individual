# Ritma Veritabanı Tasarımı

Tarih: 2026-11-05 · Branch: `feat/db-setup`

## Amaç

Backend şu an tüm veriyi bellekte tutuyor; sunucu yeniden başlayınca her şey siliniyor. Verilerin kalıcı olması için ücretsiz ve bulut üzerinde çalışan bir PostgreSQL (Neon) kullanılacak. Servisler ve API sözleşmesi değişmez; yalnızca depo katmanı Postgres ile de çalışır hale gelir.

## Kararlar

- Servis: Neon (ücretsiz plan). Bağlantı adresi `backend/.env` içindeki `DATABASE_URL`'dedir ve git'e girmez.
- İstemci: `pg` (+ `@types/pg`). ORM ve migration kütüphanesi yok.
- Migration: düz `.sql` dosyaları, küçük bir çalıştırıcı betik.
- Şema dosyaları repo kökündeki `db/` klasöründe tutulur.
- `DATABASE_URL` boşsa uygulama eskisi gibi bellek depolarıyla çalışır; testler de bellekle kalır.
- Kullanıcılar `users` tablosunda tutulur; demo kullanıcılar başlangıçta tabloya eklenir (upsert).

## Şema (`db/migrations/001_init.sql`)

Eklenti: `btree_gist` (çakışma kısıtı için).

### `users`
| Sütun | Tür | Not |
|---|---|---|
| `id` | `text` PK | Mevcut kimlikler (`demo-user-ayse`) uyumlu kalır |
| `email` | `text` NOT NULL | `lower(email)` üzerinde tekil dizin |
| `display_name` | `text` NOT NULL | |
| `created_at` | `timestamptz` NOT NULL | varsayılan `now()` |

### `customers`
| Sütun | Tür | Not |
|---|---|---|
| `id` | `text` PK | |
| `user_id` | `text` NOT NULL | `users(id)` yabancı anahtarı |
| `first_name`, `last_name` | `text` NOT NULL | |
| `birth_date` | `date` NOT NULL | |
| `gender` | `text` NOT NULL | CHECK: `female`, `male`, `other`, `undisclosed` |
| `deleted_at` | `timestamptz` NULL | Yumuşak silme |

Dizin: `customers(user_id)` WHERE `deleted_at IS NULL`.

### `appointments`
| Sütun | Tür | Not |
|---|---|---|
| `id` | `text` PK | |
| `user_id` | `text` NOT NULL | `users(id)` yabancı anahtarı |
| `customer_id` | `text` NOT NULL | `customers(id)` yabancı anahtarı |
| `date` | `date` NOT NULL | |
| `start_time`, `end_time` | `time` NOT NULL | CHECK: `end_time > start_time` |
| `status` | `text` NOT NULL | CHECK: `scheduled`, `completed`, `cancelled` |
| `note` | `text` NOT NULL | varsayılan `''` |

- Çakışma kuralı veritabanında zorunlu: `EXCLUDE USING gist (user_id WITH =, tsrange(date + start_time, date + end_time) WITH &&) WHERE (status <> 'cancelled')`. Böylece aynı kullanıcının iptal edilmemiş iki randevusu aynı saat aralığına giremez; kontrol ve yazma tek ifadede, atomik olur.
- Dizin: `appointments(user_id, date)`.

### `sessions`
| Sütun | Tür | Not |
|---|---|---|
| `token_hash` | `text` PK | Jetonun SHA-256 özeti; düz jeton saklanmaz |
| `user_id` | `text` NOT NULL | `users(id)` yabancı anahtarı, `ON DELETE CASCADE` |
| `created_at` | `timestamptz` NOT NULL | varsayılan `now()` |

Oturum süre sonu şimdilik yok (bellek deposunda da yok).

### `schema_migrations`
Çalıştırıcı tarafından oluşturulur: `name text PK`, `applied_at timestamptz`.

## Kod yerleşimi

- `backend/src/db/pool.ts`: `pg.Pool` kurar. Tür çözücüleri ayarlanır: `date` (1082) `'YYYY-MM-DD'` metni, `time` (1083) `'HH:MM'` metni olarak döner. Aksi halde `pg` `date`'i yerel saatte `Date`'e çevirir ve gün kayar.
- `backend/src/repositories/postgres/`: `customer-repository.ts`, `appointment-repository.ts`, `session-store.ts`. Mevcut `CustomerRepository`, `AppointmentRepository` ve `SessionStore` arayüzlerini (`repositories/types.ts`) gerçekler.
  - `saveIfNoConflict`: INSERT ... ON CONFLICT (id) DO UPDATE; çakışma kısıtı ihlali (`23P01`, `exclusion_violation`) yakalanıp `undefined` döndürülür.
  - `SessionStore.create` jetonu üretir, özetini yazar, düz jetonu çağırana döner; `find` ve `delete` gelen jetonu özetleyip arar.
- `backend/src/deps.ts`: `config.databaseUrl` varsa Postgres depoları, yoksa bellek depoları kurulur. Demo hesaplar açıksa başlangıçta demo kullanıcılar `users`'a upsert edilir. Production'da demo kapalıyken veritabanına demo kullanıcı girmez.
- `backend/scripts/migrate.ts` (`npm run db:migrate`): `db/migrations/*.sql` dosyalarını ada göre sırayla çalıştırır, uygulananları `schema_migrations`'a yazar. Her dosya tek bir transaction içindedir; hata olursa o dosya geri alınır ve çalıştırıcı durur.
- `backend/scripts/db-check.ts` (`npm run db:check`): bağlantı testi (hazır).

## Hata işleme

- Başlangıçta `DATABASE_URL` tanımlıysa ama bağlantı kurulamazsa sunucu açıklayıcı bir hata ile kapanır (sessizce belleğe düşmez).
- Çakışma dışındaki veritabanı hataları mevcut hata işleyiciye gider ve 500 olarak döner; hata mesajında bağlantı adresi geçmez.

## Test

- Mevcut 102 test bellek depolarıyla aynen çalışır.
- Postgres depo ve migration testleri yalnızca `TEST_DATABASE_URL` tanımlıysa çalışır, aksi halde atlanır. Ayrı bir Neon branch'i kullanılır; her koşuda rastgele adlı geçici bir şema açılır ve sonunda silinir. Gerçek `DATABASE_URL`'e testler dokunmaz.
- Bellek ve Postgres depoları aynı davranış testlerini paylaşır (aynı senaryolar iki gerçeklemeye karşı çalışır): kullanıcıya göre izolasyon, yumuşak silme, tarih aralığı sıralaması, çakışma reddi, iptal edilenin çakışma saymaması, oturum oluşturma/bulma/silme.
- `.env.example`'a `TEST_DATABASE_URL` eklenir.

## Kapsam dışı

Google girişi, oturum süresi, ORM, yedekleme ve veri taşıma (bellekteki veri zaten geçicidir). Bunlar ayrı işlerdir.

## Başarı ölçütü

`DATABASE_URL` ile açılan sunucuda müşteri ve randevu eklenip sunucu yeniden başlatıldığında veriler duruyor; aynı saate ikinci randevu 409 dönüyor; `DATABASE_URL` yokken uygulama ve tüm testler bugünkü gibi çalışıyor.

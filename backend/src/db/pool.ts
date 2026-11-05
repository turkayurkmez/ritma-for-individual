import pg from 'pg';

const DATE_OID = 1082;
const TIME_OID = 1083;

/**
 * `pg` varsayılan olarak `date` değerini yerel saatte `Date`'e çevirir ve gün kayar.
 * Burada `date` 'YYYY-MM-DD', `time` 'HH:MM' metni olarak döner. Çözücüler yalnızca bu havuza aittir.
 */
const types = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === DATE_OID) return (value: string) => value;
    if (oid === TIME_OID) return (value: string) => value.slice(0, 5);
    return pg.types.getTypeParser(oid, format as 'text');
  },
};

/** Neon'un uyuyan sunucusunu uyandırmak birkaç saniye sürebilir; ulaşılamayan adres ise sonsuza dek beklemesin. */
const CONNECTION_TIMEOUT_MS = 15_000;

export function createPool(databaseUrl: string, options: pg.PoolConfig = {}): pg.Pool {
  const pool = new pg.Pool({ connectionString: databaseUrl, types, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS, ...options });
  // Boşta bekleyen bağlantı koparsa (Neon uyku/yeniden başlatma) dinleyici yoksa süreç çöker.
  pool.on('error', (error) => {
    console.error('Veritabanı bağlantı hatası:', error.message);
  });
  return pool;
}

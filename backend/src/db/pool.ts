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

export function createPool(databaseUrl: string, options: pg.PoolConfig = {}): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl, types, ...options });
}

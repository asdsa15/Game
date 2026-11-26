import { makeDb, type Connectable } from './db.ts';
import { openPglite, type OpenedDb } from './db-pglite.ts';
import type { Config } from './env.ts';

/**
 * 服务端与脚本共用同一个开库入口，避免"启动用 PGlite、种子脚本连 Postgres"这种错位。
 */
export async function openDatabase(config: Config): Promise<OpenedDb> {
  if (config.dbDriver === 'pglite') {
    return openPglite(config.pgliteDir);
  }
  // 只有接真 Postgres 时才加载 pg
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return {
    db: makeDb(pool as unknown as Connectable),
    driver: 'postgres',
    location: config.databaseUrl,
    close: async () => { await pool.end(); },
  };
}

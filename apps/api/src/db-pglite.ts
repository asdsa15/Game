import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { makeDb, type Connectable, type Db, type Queryable } from './db.ts';

const SCHEMA = readFileSync(new URL('../db/001_init.sql', import.meta.url), 'utf8');

/**
 * PGlite = 真正的 PostgreSQL 编译成 WASM，跑在进程内，数据落本地目录。
 * 选它而不是 SQLite：SQL 是同一套（jsonb / 表达式索引 / for update / interval 全都真支持），
 * 将来要换真 Postgres，代码一行不用改——这才叫"本地开发、随时可搬家"。
 * 选它而不是 Docker + Postgres：本机没装 Docker，一条 npm run dev 就能跑起来比什么都重要。
 */
export function pgliteAdapter(pg: PGlite): Connectable {
  const q: Queryable & { release(): void } = {
    async query(sql: string, params: unknown[] = []) {
      const r = await pg.query(sql, params);
      return { rows: r.rows as unknown[], rowCount: r.affectedRows ?? r.rows.length };
    },
    release() { /* 单连接，无需释放 */ },
  };
  return {
    query: (sql, params) => q.query(sql, params),
    connect: async () => q,
  };
}

export interface OpenedDb {
  db: Db;
  driver: 'pglite' | 'postgres';
  location: string;
  close: () => Promise<void>;
}

/** 建表放在启动里：本地项目，不该让用户先跑一条 db:init 才能用 */
async function ensureSchema(pg: PGlite): Promise<void> {
  await pg.exec(SCHEMA);
}

export async function openPglite(dir: string): Promise<OpenedDb> {
  const memory = dir === 'memory' || dir === ':memory:';
  if (!memory) mkdirSync(dir, { recursive: true });
  const pg = memory ? new PGlite() : await PGlite.create(dir);
  await ensureSchema(pg);
  return {
    db: makeDb(pgliteAdapter(pg)),
    driver: 'pglite',
    location: memory ? ':memory:' : dir,
    close: async () => { await pg.close(); },
  };
}

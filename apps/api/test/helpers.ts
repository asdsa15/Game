import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { makeDb, type Connectable, type Queryable } from '../src/db.ts';
import { makeTokens } from '../src/lib/tokens.ts';
import { buildApp } from '../src/app.ts';
import type { Config } from '../src/env.ts';

const SCHEMA = readFileSync(new URL('../db/001_init.sql', import.meta.url), 'utf8');

export const TEST_SECRET = 'test-secret-0123456789abcdef0123456789';

export const testConfig: Config = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 0,
  databaseUrl: 'pglite://memory',
  jwtSecret: TEST_SECRET,
  accessTtl: 900,
  refreshTtl: 2_592_000,
  corsOrigins: ['http://localhost:5173'],
  cookieSecure: false,
  bodyLimit: 2 * 1024 * 1024,
  saveBytesMax: 64 * 1024,
};

/**
 * 测试库用 PGlite（真 Postgres 编译成 WASM）。
 * 不用 pg-mem：jsonb、表达式唯一索引、`for update`、interval 运算它都只支持一部分，
 * 用不完整的模拟库测出来的"通过"没有意义。PGlite 是同一个 PG 引擎，语义一致，且不需要 Docker。
 */
export function pgliteAdapter(pg: PGlite): Connectable {
  const q: Queryable & { release(): void } = {
    async query(sql: string, params: unknown[] = []) {
      const r = await pg.query(sql, params as unknown[]);
      return { rows: r.rows as unknown[], rowCount: r.affectedRows ?? r.rows.length };
    },
    release() { /* 单连接，无需释放 */ },
  };
  return {
    query: (sql, params) => q.query(sql, params),
    connect: async () => q,
  };
}

export interface TestCtx {
  app: Awaited<ReturnType<typeof buildApp>>;
  db: ReturnType<typeof makeDb>;
  pg: PGlite;
  close: () => Promise<void>;
}

export async function makeTestCtx(overrides: Partial<Config> = {}): Promise<TestCtx> {
  const pg = new PGlite();
  await pg.exec(SCHEMA);
  const db = makeDb(pgliteAdapter(pg));
  const config: Config = { ...testConfig, ...overrides };
  const tokens = makeTokens(config.jwtSecret, config.accessTtl);
  const app = await buildApp({ config, db, tokens });
  await app.ready();
  return {
    app,
    db,
    pg,
    close: async () => { await app.close(); await pg.close(); },
  };
}

/** 从 set-cookie 里取某个 cookie 的值 */
export function cookieOf(res: { headers: Record<string, unknown> }, name: string): string | null {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? [raw] : [];
  for (const line of list) {
    const m = new RegExp(`(?:^|,\\s*)${name}=([^;]+)`).exec(line);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

export async function registerUser(
  ctx: TestCtx,
  email = 'a@example.com',
  nickname = '试道',
  password = 'password123',
): Promise<{ access: string; refresh: string; userId: string }> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, nickname, password },
  });
  if (res.statusCode !== 201) throw new Error('注册失败：' + res.body);
  const body = res.json() as { accessToken: string; user: { id: string } };
  const refresh = cookieOf(res, 'wd_rt');
  if (!refresh) throw new Error('注册未下发 refresh cookie');
  return { access: body.accessToken, refresh, userId: body.user.id };
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });

export function makeSave(seed = 'seed-1', over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: 'wendao-save',
    version: 2,
    contentVersion: '0.1.0',
    savedAt: Date.now(),
    seed,
    state: { seed, xRealm: 1, dao: '无名', age: 22, turn: 3 },
    meta: { dao: '无名', realm: 1, age: 22 },
    ...over,
  };
}

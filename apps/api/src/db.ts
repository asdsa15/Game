/**
 * 数据库访问只有一个入口。
 *
 * 为什么不用 ORM：本服务的查询不到 20 条，且都是"一表一句"。
 * 引 Prisma 会带来生成物、迁移工具与运行时的三份耦合；
 * 用 pg + 显式 SQL，schema 就是 db/001_init.sql，评审时一眼能看完。
 * 等表多到需要迁移编排（>15 张或需要回滚脚本）再引 ORM，那时才划算。
 */

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/** pg.Pool / pg.Client / pg-mem 适配器都满足这个形状 */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

export interface Connectable extends Queryable {
  connect(): Promise<Queryable & { release(): void }>;
}

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  tx<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export function makeDb(pool: Connectable): Db {
  const wrap = (q: Queryable & Partial<Connectable>): Db => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await q.query(sql, params);
      return { rows: r.rows as T[], rowCount: r.rowCount ?? r.rows.length };
    },
    async tx<T>(fn: (tx: Db) => Promise<T>) {
      // 事务只能嵌套在真实连接上；测试库若不支持 connect，退化为直接执行
      const connect = q.connect;
      if (typeof connect !== 'function') return fn(wrap(q));
      const client = await connect.call(q);
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* 连接已坏，忽略 */ }
        throw err;
      } finally {
        client.release();
      }
    },
  });
  return wrap(pool);
}

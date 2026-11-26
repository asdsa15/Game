/**
 * 建表。可重复执行（SQL 里全是 if not exists）。
 * 用法：cp .env.example .env && npm run db:init
 *
 * 为什么不是迁移框架：第一版只有一张 init.sql。等需要"改列/回滚"时再引
 * 目录式迁移（db/migrations/001_xxx.sql，按文件名排序执行，记 schema_migrations 表）。
 * 现在引框架，等于给一张静态表配一套租约系统。
 */
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { loadConfig } from '../src/env.ts';

const config = loadConfig();
const sql = readFileSync(new URL('../db/001_init.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: config.databaseUrl });

try {
  await pool.query(sql);
  const { rows } = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  );
  console.log('建表完成，当前表：');
  for (const r of rows) console.log('  -', r.table_name);
} finally {
  await pool.end();
}

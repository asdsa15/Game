/**
 * 建表 + 列出当前表。可重复执行（SQL 里全是 if not exists）。
 *
 * PGlite 模式（默认）下建表在 openDatabase 里已自动完成，这里只把结果打出来，
 * 方便确认"库到底建成什么样、落在哪个目录"。接真 Postgres 时才需要先跑这一条。
 */
import { loadConfig } from '../src/env.ts';
import { openDatabase } from '../src/open-db.ts';

const config = loadConfig();
const opened = await openDatabase(config);

try {
  const { rows } = await opened.db.query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  );
  console.log(`库：${opened.driver} @ ${opened.location}`);
  console.log('当前表：');
  for (const r of rows) console.log('  -', r.table_name);
} finally {
  await opened.close();
}

import manifest from '../tables/manifest.json' with { type: 'json' };
import { TABLE_GROUPS, TABLE_NAMES } from './tables.generated.ts';

/**
 * 内容总表。
 *
 * 旧版把 116 张表写在 `wxcs3-data.js` 的一个对象里，谁都能改、改完没人验。
 * 现在：数据是 JSON（逐表可 diff），类型是签入的快照（改类型必须改快照），
 * 语义由 `validate.ts` 逐条查（id 唯一、引用存在、价格非负）。
 *
 * `CONTENT` 在加载时深冻结：规则层只许读。要改内容，改表、重新生成，不要运行时打补丁。
 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export type TableName = (typeof TABLE_NAMES)[number];

const merged: Record<string, unknown> = {};
for (const group of Object.values(TABLE_GROUPS)) {
  for (const [table, data] of Object.entries(group as Record<string, unknown>)) {
    merged[table] = data;
  }
}

export const CONTENT: Readonly<Record<string, unknown>> = deepFreeze(merged);
export const CONTENT_MANIFEST = manifest;
export const CONTENT_VERSION: string = manifest.contentVersion;
export const CONTENT_DIGEST: string = manifest.digest;
export const CONTENT_TABLE_NAMES: readonly string[] = TABLE_NAMES;

/** 取一张表并断言它存在——比 `CONTENT.X as T` 好，错表名会立刻炸而不是 undefined。 */
export function table<T = unknown>(name: string): T {
  const value = CONTENT[name];
  if (value === undefined) throw new Error(`内容表不存在：${name}`);
  return value as T;
}

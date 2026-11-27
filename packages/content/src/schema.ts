import { z } from 'zod';
import spec from '../tables.schema.json' with { type: 'json' };

/**
 * 由**签入仓库的类型快照**构建 zod schema。
 *
 * 为什么不"运行时从数据推断"：那样等于自己验自己，永远通过。
 * 快照由 `tools/extract-content.mjs` 一次生成、随数据一起 review，
 * 之后谁改了字段类型（数字变字符串、可选变必填）都会当场红。
 *
 * 描述符刻意做得比 JSON Schema 小：只需要 object / array / 标量 / 可选 / 可空。
 * 复杂语义（概率区间、价格非负、交叉引用）不放这里——那些属于 validate.ts，
 * 因为它们不是"类型"，而是"这条数据讲不讲得通"。
 */
export type Shape =
  | { t: 'string' | 'number' | 'integer' | 'boolean' | 'any'; nullable?: boolean }
  | { t: 'array'; of: Shape; nullable?: boolean }
  | { t: 'object'; fields: Record<string, Shape>; optional?: string[]; nullable?: boolean };

const SPEC = spec as unknown as Record<string, Shape>;

function build(shape: Shape): z.ZodTypeAny {
  let node: z.ZodTypeAny;
  switch (shape.t) {
    case 'string':
      node = z.string();
      break;
    case 'integer':
      node = z.number().int();
      break;
    case 'number':
      node = z.number();
      break;
    case 'boolean':
      node = z.boolean();
      break;
    case 'array':
      node = z.array(build(shape.of));
      break;
    case 'object': {
      const optional = new Set(shape.optional ?? []);
      const fields: Record<string, z.ZodTypeAny> = {};
      for (const [key, child] of Object.entries(shape.fields)) {
        const built = build(child);
        fields[key] = optional.has(key) ? built.optional() : built;
      }
      // strict：多出来的键就是"你没想清楚的新字段"，必须显式加进快照
      node = z.object(fields).strict();
      break;
    }
    default:
      node = z.unknown();
  }
  return shape.nullable ? node.nullable() : node;
}

/** 每张表一个 schema；键就是旧 `WXCS3_DATA` 的表名。 */
export const TABLE_SCHEMAS: Record<string, z.ZodTypeAny> = Object.fromEntries(
  Object.entries(SPEC).map(([table, shape]) => [table, build(shape)]),
);

export const TABLE_SHAPES: Record<string, Shape> = SPEC;
export { z };

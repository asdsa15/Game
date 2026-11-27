import { z } from 'zod';

/**
 * 内容版本。P1a 的内容包与后端 `/content/version` 共用这一组类型。
 *
 * 语义：`contentVersion` 是**内容**的版本（117 张表 + 文案），
 * 与存档信封里的 `contentVersion` 同义——存档记下"它是在哪一版内容下打出来的"，
 * 日后做灰度或回放时靠它对上号。
 */
export const ContentVersionSchema = z.object({
  version: z.string().min(1).max(64),
  tables: z.number().int().positive(),
  /** 内容指纹：稳定序列化后取前 16 位，用来判断"两份内容是不是同一份" */
  digest: z.string().length(16),
  builtAt: z.number().int().nonnegative().optional(),
});
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

export const ContentTableParamsSchema = z.object({
  table: z.string().min(2).max(64),
});
export type ContentTableParams = z.infer<typeof ContentTableParamsSchema>;

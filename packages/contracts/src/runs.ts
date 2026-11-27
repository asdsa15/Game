import { z } from 'zod';

/**
 * 结局上报。**不收 score**：分数由服务端 `lib/score.ts` 算，
 * 客户端改分无效。P4b 之后还会加 `{seed, commands[]}` 重放校验。
 */
export const RunSubmitBodySchema = z.object({
  seed: z.string().min(1).max(128),
  ending: z.string().min(1).max(32),
  realm: z.coerce.number().int().min(0).max(12),
  age: z.coerce.number().int().min(0).max(2000),
});
export type RunSubmitBody = z.infer<typeof RunSubmitBodySchema>;

export const RunRowSchema = z.object({
  id: z.string(),
  seed: z.string(),
  ending: z.string(),
  realm: z.number().int(),
  age: z.number().int(),
  score: z.number().int(),
  endedAt: z.string(),
});
export type RunRow = z.infer<typeof RunRowSchema>;

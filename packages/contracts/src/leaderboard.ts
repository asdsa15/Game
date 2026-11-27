import { z } from 'zod';

/** 榜单：三档口径，与 `apps/api/src/routes/leaderboard.ts` 对齐。 */
export const BoardSchema = z.enum(['score', 'realm', 'age']);
export type Board = z.infer<typeof BoardSchema>;

export const LeaderboardQuerySchema = z.object({
  board: BoardSchema.default('score'),
  page: z.coerce.number().int().min(1).max(200).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export const LeaderboardRowSchema = z.object({
  rank: z.number().int().positive(),
  nickname: z.string(),
  ending: z.string(),
  realm: z.number().int(),
  age: z.number().int(),
  score: z.number().int(),
  endedAt: z.string(),
});
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;

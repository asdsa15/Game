import { z } from 'zod';
import { runs, type Board } from '../repo/runs.ts';
import { type Deps, type Register, parseBody } from './_shared.ts';

const Query = z.object({
  board: z.enum(['score', 'realm', 'age']).default('score'),
  page: z.coerce.number().int().min(1).max(200).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
});

export const registerLeaderboardRoutes: Register = (app, deps: Deps) => {
  /**
   * 榜单走 PostgreSQL 而不是 Redis。
   * 理由：单机文字游戏，榜单读 QPS 极低；`runs` 上的复合索引已经够用，
   * 多引一个 Redis 只是多一份运维和一致性负担——那才是"看起来像项目"而不是"是项目"。
   * 切换点写在这里，免得后人以为忘了：当 reads > 50 QPS 或 runs > 500 万行时，改 Redis zset。
   */
  app.get('/leaderboard', async (req) => {
    const q = parseBody(Query, req.query);
    const rows = await runs.board(deps.db, q.board as Board, q.size, (q.page - 1) * q.size);
    return { board: q.board, page: q.page, size: q.size, entries: rows };
  });
};

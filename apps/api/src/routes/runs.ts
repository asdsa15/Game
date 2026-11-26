import { z } from 'zod';
import { runs } from '../repo/runs.ts';
import { badRequest } from '../lib/errors.ts';
import { computeScore, KNOWN_ENDINGS } from '../lib/score.ts';
import { type Deps, type Register, parseBody, requireAuth } from './_shared.ts';

const SubmitBody = z.object({
  seed: z.string().min(1).max(128),
  ending: z.string().min(1).max(32),
  realm: z.coerce.number().int().min(0).max(12),
  age: z.coerce.number().int().min(0).max(2000),
});

export const registerRunRoutes: Register = (app, deps: Deps) => {
  /**
   * 提交一次结局。
   * 注意 body 里**不收 score**：分数由服务端按 lib/score.ts 的公式算。
   * 客户端改分无用，这是最省事也最有效的一道防作弊。
   */
  app.post('/runs', async (req, reply) => {
    const claims = await requireAuth(req, deps);
    const body = parseBody(SubmitBody, req.body);
    if (!KNOWN_ENDINGS.includes(body.ending)) {
      throw badRequest('UNKNOWN_ENDING', `未知结局：${body.ending}（需在 lib/score.ts 登记档次）`);
    }
    const score = computeScore(body);
    const row = await runs.insert(deps.db, {
      userId: claims.sub,
      seed: body.seed,
      ending: body.ending,
      realm: body.realm,
      age: body.age,
      score,
    });
    reply.code(201);
    return {
      id: row.id,
      ending: row.ending,
      realm: Number(row.realm),
      age: Number(row.age),
      score: Number(row.score),
      verified: row.verified,
      endedAt: new Date(row.ended_at).toISOString(),
    };
  });

  app.get('/runs/mine', async (req) => {
    const claims = await requireAuth(req, deps);
    const [list, total] = await Promise.all([
      runs.listByUser(deps.db, claims.sub, 20),
      runs.countByUser(deps.db, claims.sub),
    ]);
    return {
      total,
      runs: list.map(r => ({
        id: r.id,
        seed: r.seed,
        ending: r.ending,
        realm: Number(r.realm),
        age: Number(r.age),
        score: Number(r.score),
        verified: r.verified,
        endedAt: new Date(r.ended_at).toISOString(),
      })),
    };
  });
};

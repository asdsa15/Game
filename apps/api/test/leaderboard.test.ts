import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { makeTestCtx, registerUser, type TestCtx } from './helpers.ts';

let ctx: TestCtx;

/** 直接落库，才能控制 ended_at 做"同分先到先得"的判定 */
async function seedRun(
  userId: string,
  r: { ending: string; realm: number; age: number; score: number; at: string },
): Promise<void> {
  await ctx.db.query(
    `insert into runs (id, user_id, seed, ending, realm, age, score, verified, ended_at)
     values ($1, $2, 'seed', $3, $4, $5, $6, false, $7)`,
    [randomUUID(), userId, r.ending, r.realm, r.age, r.score, r.at],
  );
}

beforeAll(async () => {
  ctx = await makeTestCtx();
  const a = await registerUser(ctx, 'lb-a@example.com', '甲');
  const b = await registerUser(ctx, 'lb-b@example.com', '乙');
  const c = await registerUser(ctx, 'lb-c@example.com', '丙');

  // 甲两次：取高的那次
  await seedRun(a.userId, { ending: 'guowei', realm: 5, age: 100, score: 7000, at: '2026-01-01T00:00:00Z' });
  await seedRun(a.userId, { ending: 'ascend', realm: 6, age: 90, score: 8000, at: '2026-02-01T00:00:00Z' });
  // 乙：与甲最高分并列，但更早到
  await seedRun(b.userId, { ending: 'daotai', realm: 6, age: 88, score: 8000, at: '2025-12-01T00:00:00Z' });
  // 丙：境界高但分数低
  await seedRun(c.userId, { ending: 'xiaoyao', realm: 7, age: 40, score: 1000, at: '2026-03-01T00:00:00Z' });
});
afterAll(async () => { await ctx.close(); });

describe('榜单', () => {
  it('每人只出现一次（取最好那条）', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=score' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { entries: { nickname: string; score: number }[] };
    expect(body.entries).toHaveLength(3);
    expect(body.entries.map(e => e.nickname).sort()).toEqual(['丙', '乙', '甲'].sort());
    // 甲被取的是 8000，不是 7000
    expect(body.entries.find(e => e.nickname === '甲')?.score).toBe(8000);
  });

  it('同分：先到者在前', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=score' });
    const body = res.json() as { entries: { nickname: string; rank: number }[] };
    expect(body.entries[0]).toMatchObject({ nickname: '乙', rank: 1 });
    expect(body.entries[1]).toMatchObject({ nickname: '甲', rank: 2 });
  });

  it('按境界排：丙第一', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=realm' });
    const body = res.json() as { entries: { nickname: string; realm: number }[] };
    expect(body.entries[0]).toMatchObject({ nickname: '丙', realm: 7 });
  });

  it('按寿元排：甲第一（100 岁）', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=age' });
    const body = res.json() as { entries: { nickname: string; age: number }[] };
    expect(body.entries[0]).toMatchObject({ nickname: '甲', age: 100 });
  });

  it('分页：size=2 第二页只有 1 条，rank 接续', async () => {
    const p1 = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=score&size=2&page=1' });
    const p2 = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=score&size=2&page=2' });
    expect((p1.json() as { entries: unknown[] }).entries).toHaveLength(2);
    const second = (p2.json() as { entries: { rank: number }[] }).entries;
    expect(second).toHaveLength(1);
    expect(second[0]?.rank).toBe(3);
  });

  it('非法 board 参数：400（枚举挡在 zod 里，不会拼进 SQL）', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard?board=hack' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });
  });

  it('榜单是公开的：不带令牌也能看', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/leaderboard' });
    expect(res.statusCode).toBe(200);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestCtx, registerUser, auth, type TestCtx } from './helpers.ts';

let ctx: TestCtx;
let token = '';

beforeAll(async () => {
  ctx = await makeTestCtx();
  token = (await registerUser(ctx, 'run@example.com', '结局')).access;
});
afterAll(async () => { await ctx.close(); });

const submit = (payload: Record<string, unknown>, t = token) =>
  ctx.app.inject({ method: 'POST', url: '/runs', payload, headers: auth(t) });

describe('结局上报', () => {
  it('提交成功：分数由服务端算', async () => {
    const res = await submit({ seed: 's1', ending: 'guowei', realm: 5, age: 120 });
    expect(res.statusCode).toBe(201);
    // 5*1000 + 120*10 + 1500 = 7700
    expect(res.json()).toMatchObject({ score: 7700, verified: false, ending: 'guowei' });
  });

  it('客户端塞 score 无效（请求体里没有这个字段）', async () => {
    const res = await submit({ seed: 's2', ending: 'sit', realm: 1, age: 60, score: 9_999_999 });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { score: number }).score).toBe(1 * 1000 + 60 * 10 + 100);
  });

  it('未登记的结局被拒：400 UNKNOWN_ENDING', async () => {
    const res = await submit({ seed: 's3', ending: 'made-up', realm: 1, age: 60 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'UNKNOWN_ENDING' } });
  });

  it('境界越界：400', async () => {
    const res = await submit({ seed: 's4', ending: 'sit', realm: 99, age: 60 });
    expect(res.statusCode).toBe(400);
  });

  it('未登录：401', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/runs', payload: { seed: 's', ending: 'sit', realm: 0, age: 1 } });
    expect(res.statusCode).toBe(401);
  });

  it('/runs/mine 只回自己的，且按时间倒序', async () => {
    const b = await registerUser(ctx, 'run-b@example.com', '路人');
    await submit({ seed: 'b1', ending: 'fall', realm: 0, age: 30 }, b.access);

    const mine = await ctx.app.inject({ method: 'GET', url: '/runs/mine', headers: auth(token) });
    expect(mine.statusCode).toBe(200);
    const body = mine.json() as { total: number; runs: { seed: string }[] };
    expect(body.total).toBe(2);
    expect(body.runs.every(r => r.seed.startsWith('s'))).toBe(true);
    expect(body.runs[0]?.seed).toBe('s2');   // 后提交的在前
  });
});

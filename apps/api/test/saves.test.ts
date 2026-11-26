import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestCtx, registerUser, auth, makeSave, type TestCtx } from './helpers.ts';

let ctx: TestCtx;
let token = '';

beforeAll(async () => {
  ctx = await makeTestCtx();
  token = (await registerUser(ctx, 'save@example.com', '存档')).access;
});
afterAll(async () => { await ctx.close(); });

const put = (slot: number, body: unknown, headers: Record<string, string> = {}, t = token) =>
  ctx.app.inject({ method: 'PUT', url: `/saves/${slot}`, payload: body as object, headers: { ...auth(t), ...headers } });

describe('云存档', () => {
  it('首次写入：201，version 1', async () => {
    const res = await put(1, makeSave('seed-a'));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ slot: 1, version: 1, created: true });
  });

  it('读回：信封与 state 都在', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/saves/1', headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toMatchObject({ slot: 1, version: 1, seed: 'seed-a', contentVersion: '0.1.0' });
    expect(body.state).toMatchObject({ xRealm: 1, dao: '无名' });
  });

  it('列表只给 meta，不给 state（省流量）', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/saves', headers: auth(token) });
    const body = res.json() as { saves: Record<string, unknown>[] };
    expect(body.saves).toHaveLength(1);
    expect(body.saves[0]).toMatchObject({ slot: 1, version: 1 });
    expect(body.saves[0]).not.toHaveProperty('state');
  });

  it('If-Match 正确：版本 +1', async () => {
    const res = await put(1, makeSave('seed-a', { savedAt: 123 }), { 'if-match': '1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ version: 2, created: false });
  });

  it('If-Match 过期：409 并回当前版本号', async () => {
    const res = await put(1, makeSave('seed-a'), { 'if-match': '1' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      error: { code: 'SAVE_CONFLICT', details: { currentVersion: 2 } },
    });
  });

  it('不带 If-Match：视为强制覆盖，版本继续 +1', async () => {
    const res = await put(1, makeSave('seed-force'));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ version: 3 });
  });

  it('PUT 只收 v2 信封：旧信封被拒', async () => {
    const legacy = { format: 'wxcs3-save', version: '10.2', savedAt: 1, state: { seed: 1, xRealm: 0 } };
    const res = await put(2, legacy);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });
  });

  it('导入旧档：规整成 v2，并回报来源', async () => {
    const legacy = {
      format: 'wxcs3-save',
      version: '10.2',
      savedAt: 1_700_000_000_000,
      state: { seed: 987654, xRealm: 3, dao: '陈玄', age: 41, turn: 120, cultivation: 'xian' },
    };
    const res = await ctx.app.inject({
      method: 'POST', url: '/saves/3/import', payload: legacy, headers: auth(token),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body).toMatchObject({ slot: 3, migratedFrom: 'legacy/10.2', meta: { dao: '陈玄', realm: 3, age: 41 } });

    const back = await ctx.app.inject({ method: 'GET', url: '/saves/3', headers: auth(token) });
    const save = back.json() as Record<string, unknown>;
    expect(save).toMatchObject({ seed: '987654', contentVersion: 'legacy/10.2' });
  });

  it('导入裸 state 也认', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/saves/4/import',
      payload: { seed: 42, xRealm: 2, dao: '散人' },
      headers: auth(token),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ migratedFrom: 'legacy/bare' });
  });

  it('认不出的东西：400，不静默兜底', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/saves/5/import', payload: { hello: 'world' }, headers: auth(token),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'SAVE_UNRECOGNIZED' } });
  });

  it('存档过大：413', async () => {
    const big = makeSave('seed-big', { state: { blob: 'x'.repeat(100 * 1024) } });
    const res = await put(6, big);
    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ error: { code: 'SAVE_TOO_LARGE' } });
  });

  it('槽位越界：400', async () => {
    const res = await put(99, makeSave());
    expect(res.statusCode).toBe(400);
  });

  it('跨账号隔离：B 看不到 A 的档', async () => {
    const b = await registerUser(ctx, 'other@example.com', '他人');
    const res = await ctx.app.inject({ method: 'GET', url: '/saves/1', headers: auth(b.access) });
    expect(res.statusCode).toBe(404);
    const list = await ctx.app.inject({ method: 'GET', url: '/saves', headers: auth(b.access) });
    expect((list.json() as { saves: unknown[] }).saves).toHaveLength(0);
  });

  it('删除：204，再删 404', async () => {
    const first = await ctx.app.inject({ method: 'DELETE', url: '/saves/4', headers: auth(token) });
    expect(first.statusCode).toBe(204);
    const again = await ctx.app.inject({ method: 'DELETE', url: '/saves/4', headers: auth(token) });
    expect(again.statusCode).toBe(404);
  });

  it('未登录：401', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/saves' });
    expect(res.statusCode).toBe(401);
  });
});

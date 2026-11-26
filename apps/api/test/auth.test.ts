import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestCtx, cookieOf, registerUser, auth, type TestCtx } from './helpers.ts';

let ctx: TestCtx;

beforeAll(async () => { ctx = await makeTestCtx(); });
afterAll(async () => { await ctx.close(); });

describe('账号与令牌', () => {
  it('健康检查走通数据库', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });

  it('注册成功：201 + access + httpOnly refresh cookie', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'Reg@Example.com', nickname: '清玄', password: 'password123' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { user: { email: string }; accessToken: string };
    expect(body.user.email).toBe('reg@example.com');   // 统一小写
    expect(body.accessToken.split('.')).toHaveLength(3);
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('wd_rt=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/auth');
  });

  it('邮箱重复：409 EMAIL_TAKEN', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'reg@example.com', nickname: '另一个', password: 'password123' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'EMAIL_TAKEN' } });
  });

  it('弱口令被挡：400 VALIDATION', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'weak@example.com', nickname: '弱', password: '123' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });
  });

  it('登录：密码错与账号不存在返回同一句，不做用户枚举', async () => {
    await ctx.app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'login@example.com', nickname: '登录', password: 'password123' },
    });
    const wrong = await ctx.app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'login@example.com', password: 'wrong-password' },
    });
    const missing = await ctx.app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(missing.statusCode).toBe(401);
    expect(wrong.json()).toEqual(missing.json());
  });

  it('刷新轮换：旧 refresh 用一次就作废', async () => {
    const u = await registerUser(ctx, 'rotate@example.com', '轮换');

    const first = await ctx.app.inject({
      method: 'POST', url: '/auth/refresh', cookies: { wd_rt: u.refresh },
    });
    expect(first.statusCode).toBe(200);
    const next = cookieOf(first, 'wd_rt');
    expect(next).toBeTruthy();
    expect(next).not.toBe(u.refresh);

    const reuse = await ctx.app.inject({
      method: 'POST', url: '/auth/refresh', cookies: { wd_rt: u.refresh },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json()).toMatchObject({ error: { code: 'REFRESH_INVALID' } });

    const second = await ctx.app.inject({
      method: 'POST', url: '/auth/refresh', cookies: { wd_rt: next! },
    });
    expect(second.statusCode).toBe(200);
  });

  it('登出后 refresh 失效', async () => {
    const u = await registerUser(ctx, 'logout@example.com', '登出');
    const out = await ctx.app.inject({
      method: 'POST', url: '/auth/logout', cookies: { wd_rt: u.refresh },
    });
    expect(out.statusCode).toBe(204);
    const after = await ctx.app.inject({
      method: 'POST', url: '/auth/refresh', cookies: { wd_rt: u.refresh },
    });
    expect(after.statusCode).toBe(401);
  });

  it('/me 需要令牌，令牌有效返回本人', async () => {
    const u = await registerUser(ctx, 'me@example.com', '本人');
    const no = await ctx.app.inject({ method: 'GET', url: '/me' });
    expect(no.statusCode).toBe(401);

    const bad = await ctx.app.inject({ method: 'GET', url: '/me', headers: auth('garbage.token.here') });
    expect(bad.statusCode).toBe(401);
    expect(bad.json()).toMatchObject({ error: { code: 'TOKEN_INVALID' } });

    const ok = await ctx.app.inject({ method: 'GET', url: '/me', headers: auth(u.access) });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ user: { email: 'me@example.com' } });
  });
});

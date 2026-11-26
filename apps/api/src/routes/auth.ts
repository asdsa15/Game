import { z } from 'zod';
import { users, toPublic } from '../repo/users.ts';
import { refreshTokens } from '../repo/refresh.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { conflict, unauthorized } from '../lib/errors.ts';
import {
  type Deps, type Register, parseBody, requireAuth,
  setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE,
} from './_shared.ts';

const Email = z.string().trim().toLowerCase().email('邮箱格式不对').max(254);
const Password = z.string().min(8, '密码至少 8 位').max(128);
const Nickname = z.string().trim().min(1, '昵称不能为空').max(24);

const RegisterBody = z.object({ email: Email, password: Password, nickname: Nickname });
const LoginBody = z.object({ email: Email, password: z.string().min(1).max(128) });

export const registerAuthRoutes: Register = (app, deps: Deps) => {
  const issueSession = async (
    userId: string, role: 'player' | 'editor' | 'admin', nick: string,
  ) => {
    const accessToken = await deps.tokens.signAccess({ sub: userId, role, nick });
    const refresh = deps.tokens.newRefresh();
    await refreshTokens.issue(deps.db, {
      userId,
      tokenHash: deps.tokens.hashRefresh(refresh),
      ttlSec: deps.config.refreshTtl,
    });
    return { accessToken, refresh, expiresIn: deps.config.accessTtl };
  };

  app.post('/auth/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = parseBody(RegisterBody, req.body);
    if (await users.byEmail(deps.db, body.email)) {
      throw conflict('EMAIL_TAKEN', '这个邮箱已经注册过了');
    }
    const passHash = await hashPassword(body.password);
    const user = await users.create(deps.db, { email: body.email, passHash, nickname: body.nickname });
    const s = await issueSession(user.id, user.role, user.nickname);
    setRefreshCookie(reply, deps, s.refresh);
    reply.code(201);
    return { user: toPublic(user), accessToken: s.accessToken, expiresIn: s.expiresIn };
  });

  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = parseBody(LoginBody, req.body);
    const user = await users.byEmail(deps.db, body.email);
    // 邮箱不存在与密码错误返回同一句话：不给撞库做用户枚举
    if (!user || !(await verifyPassword(body.password, user.pass_hash))) {
      throw unauthorized('INVALID_CREDENTIALS', '邮箱或密码不对');
    }
    const s = await issueSession(user.id, user.role, user.nickname);
    setRefreshCookie(reply, deps, s.refresh);
    return { user: toPublic(user), accessToken: s.accessToken, expiresIn: s.expiresIn };
  });

  /** 轮换：旧令牌立即撤销并指向新令牌，同一个 refresh 不能用两次 */
  app.post('/auth/refresh', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!raw) throw unauthorized('NO_REFRESH', '没有续期凭证');
    const hash = deps.tokens.hashRefresh(raw);
    const row = await refreshTokens.findActive(deps.db, hash);
    if (!row) {
      clearRefreshCookie(reply, deps);
      throw unauthorized('REFRESH_INVALID', '续期凭证无效，请重新登录');
    }
    const user = await users.byId(deps.db, row.user_id);
    if (!user) {
      clearRefreshCookie(reply, deps);
      throw unauthorized('USER_GONE', '账号不存在');
    }

    const accessToken = await deps.tokens.signAccess({ sub: user.id, role: user.role, nick: user.nickname });
    const next = deps.tokens.newRefresh();
    const nextId = await refreshTokens.issue(deps.db, {
      userId: user.id,
      tokenHash: deps.tokens.hashRefresh(next),
      ttlSec: deps.config.refreshTtl,
    });
    await refreshTokens.revoke(deps.db, row.id, nextId);
    setRefreshCookie(reply, deps, next);
    return { user: toPublic(user), accessToken, expiresIn: deps.config.accessTtl };
  });

  app.post('/auth/logout', async (req, reply) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (raw) {
      const row = await refreshTokens.findActive(deps.db, deps.tokens.hashRefresh(raw));
      if (row) await refreshTokens.revoke(deps.db, row.id);
    }
    clearRefreshCookie(reply, deps);
    reply.code(204);
    return null;
  });

  app.get('/me', async (req) => {
    const claims = await requireAuth(req, deps);
    const user = await users.byId(deps.db, claims.sub);
    if (!user) throw unauthorized('USER_GONE', '账号不存在');
    return { user: toPublic(user) };
  });
};

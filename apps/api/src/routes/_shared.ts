import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../env.ts';
import type { Db } from '../db.ts';
import type { Tokens, AccessClaims } from '../lib/tokens.ts';
import { badRequest, unauthorized } from '../lib/errors.ts';

export interface Deps {
  config: Config;
  db: Db;
  tokens: Tokens;
}

export function parseBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw badRequest('VALIDATION', '参数不合法', r.error.issues.map(i => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
    })));
  }
  return r.data as T;
}

/** 从 Authorization 头取身份。不做装饰器，避免为类型增强污染全局。 */
export async function requireAuth(req: FastifyRequest, deps: Deps): Promise<AccessClaims> {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) throw unauthorized();
  try {
    return await deps.tokens.verifyAccess(h.slice(7));
  } catch {
    throw unauthorized('TOKEN_INVALID', '令牌无效或已过期');
  }
}

export const REFRESH_COOKIE = 'wd_rt';

export function setRefreshCookie(reply: FastifyReply, deps: Deps, token: string): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: deps.config.cookieSecure,
    path: '/auth',
    maxAge: deps.config.refreshTtl,
  });
}

export function clearRefreshCookie(reply: FastifyReply, deps: Deps): void {
  reply.clearCookie(REFRESH_COOKIE, {
    path: '/auth',
    httpOnly: true,
    sameSite: 'lax',
    secure: deps.config.cookieSecure,
  });
}

export type Register = (app: FastifyInstance, deps: Deps) => void;

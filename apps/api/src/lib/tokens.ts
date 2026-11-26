import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export interface AccessClaims {
  sub: string;
  role: 'player' | 'editor' | 'admin';
  nick: string;
}

/**
 * 两套令牌，职责不同：
 *   access  —— JWT，15 分钟，前端只放内存（不进 localStorage，避免 XSS 直接拿走长期凭证）
 *   refresh —— 32 字节随机串，30 天，httpOnly cookie，服务端只存 sha256，可撤销、可轮换
 * 不用"长效 JWT"是刻意的：JWT 一旦签出就无法撤销，登出等于没登出。
 */
export function makeTokens(secret: string, accessTtlSec: number) {
  const key = new TextEncoder().encode(secret);
  const ISS = 'wendao';
  const AUD = 'wendao-web';

  return {
    async signAccess(c: AccessClaims): Promise<string> {
      return new SignJWT({ role: c.role, nick: c.nick })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(c.sub)
        .setIssuer(ISS)
        .setAudience(AUD)
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + accessTtlSec)
        .sign(key);
    },

    async verifyAccess(token: string): Promise<AccessClaims> {
      const { payload } = await jwtVerify(token, key, { issuer: ISS, audience: AUD });
      const sub = payload.sub;
      const role = payload.role;
      const nick = payload.nick;
      if (typeof sub !== 'string' || typeof role !== 'string' || typeof nick !== 'string') {
        throw new Error('令牌载荷不完整');
      }
      if (role !== 'player' && role !== 'editor' && role !== 'admin') throw new Error('令牌角色非法');
      return { sub, role, nick };
    },

    newRefresh(): string {
      return randomBytes(32).toString('base64url');
    },

    /** 只存散列。库被拖走也换不出可用令牌。 */
    hashRefresh(token: string): string {
      return createHash('sha256').update(token).digest('hex');
    },
  };
}

export type Tokens = ReturnType<typeof makeTokens>;

import { randomUUID } from 'node:crypto';
import type { Db } from '../db.ts';

export interface RefreshRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

export const refreshTokens = {
  async issue(db: Db, input: { userId: string; tokenHash: string; ttlSec: number }): Promise<string> {
    const id = randomUUID();
    await db.query(
      `insert into refresh_tokens (id, user_id, token_hash, expires_at)
       values ($1, $2, $3, now() + ($4 || ' seconds')::interval)`,
      [id, input.userId, input.tokenHash, String(input.ttlSec)],
    );
    return id;
  },

  /** 只认"未撤销且未过期"的令牌 */
  async findActive(db: Db, tokenHash: string): Promise<RefreshRow | null> {
    const r = await db.query<RefreshRow>(
      `select id, user_id, token_hash, expires_at, revoked_at, replaced_by
         from refresh_tokens
        where token_hash = $1
          and revoked_at is null
          and expires_at > now()`,
      [tokenHash],
    );
    return r.rows[0] ?? null;
  },

  /** 轮换：旧令牌标记撤销并指向新令牌 */
  async revoke(db: Db, id: string, replacedBy?: string): Promise<void> {
    await db.query(
      'update refresh_tokens set revoked_at = now(), replaced_by = $2 where id = $1 and revoked_at is null',
      [id, replacedBy ?? null],
    );
  },

  /** 登出全端：用在"改密码 / 疑似泄露" */
  async revokeAllForUser(db: Db, userId: string): Promise<number> {
    const r = await db.query(
      'update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null',
      [userId],
    );
    return r.rowCount;
  },
};

import { randomUUID } from 'node:crypto';
import type { Db } from '../db.ts';

export type Role = 'player' | 'editor' | 'admin';

export interface UserRow {
  id: string;
  email: string;
  pass_hash: string;
  nickname: string;
  role: Role;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  role: Role;
  createdAt: string;
}

export const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  nickname: u.nickname,
  role: u.role,
  createdAt: new Date(u.created_at).toISOString(),
});

export const users = {
  async byEmail(db: Db, email: string): Promise<UserRow | null> {
    const r = await db.query<UserRow>(
      'select id, email, pass_hash, nickname, role, created_at from users where lower(email) = lower($1)',
      [email],
    );
    return r.rows[0] ?? null;
  },

  async byId(db: Db, id: string): Promise<UserRow | null> {
    const r = await db.query<UserRow>(
      'select id, email, pass_hash, nickname, role, created_at from users where id = $1',
      [id],
    );
    return r.rows[0] ?? null;
  },

  async create(
    db: Db,
    input: { email: string; passHash: string; nickname: string; role?: Role },
  ): Promise<UserRow> {
    const id = randomUUID();
    const r = await db.query<UserRow>(
      `insert into users (id, email, pass_hash, nickname, role)
       values ($1, lower($2), $3, $4, $5)
       returning id, email, pass_hash, nickname, role, created_at`,
      [id, input.email, input.passHash, input.nickname, input.role ?? 'player'],
    );
    const row = r.rows[0];
    if (!row) throw new Error('插入用户失败');
    return row;
  },
};

import { randomUUID } from 'node:crypto';
import type { Db } from '../db.ts';

export type Board = 'score' | 'realm' | 'age';

/** 白名单列名，杜绝把外部输入拼进 SQL */
const BOARD_COL: Record<Board, string> = { score: 'score', realm: 'realm', age: 'age' };

const ORDER: Record<Board, string> = {
  score: 'r.score desc, r.ended_at asc',
  realm: 'r.realm desc, r.score desc, r.ended_at asc',
  age: 'r.age desc, r.score desc, r.ended_at asc',
};

export interface RunRow {
  id: string;
  user_id: string;
  seed: string;
  ending: string;
  realm: number;
  age: number;
  score: number;
  verified: boolean;
  ended_at: Date;
}

export interface BoardEntry {
  rank: number;
  nickname: string;
  ending: string;
  realm: number;
  age: number;
  score: number;
  endedAt: string;
}

export const runs = {
  async insert(
    db: Db,
    input: { userId: string; seed: string; ending: string; realm: number; age: number; score: number },
  ): Promise<RunRow> {
    const id = randomUUID();
    const r = await db.query<RunRow>(
      `insert into runs (id, user_id, seed, ending, realm, age, score, verified)
       values ($1, $2, $3, $4, $5, $6, $7, false)
       returning id, user_id, seed, ending, realm, age, score, verified, ended_at`,
      [id, input.userId, input.seed, input.ending, input.realm, input.age, input.score],
    );
    const row = r.rows[0];
    if (!row) throw new Error('写入结局失败');
    return row;
  },

  /**
   * 榜单：每人只取最好的一条。
   * 用 NOT EXISTS 而不是 DISTINCT ON —— 后者是 PG 方言，测试库（pg-mem）支持不全；
   * 这条 SQL 在 PG 与测试库上语义完全一致，代价只多一个索引探针。
   * 并列时按"先到先得"（ended_at 早的排前），避免同分时随机漂移。
   */
  async board(db: Db, board: Board, limit: number, offset: number): Promise<BoardEntry[]> {
    const col = BOARD_COL[board];
    const r = await db.query<{
      nickname: string; ending: string; realm: number; age: number; score: number; ended_at: string | Date;
    }>(
      `select u.nickname, r.ending, r.realm, r.age, r.score, r.ended_at
         from runs r
         join users u on u.id = r.user_id
        where not exists (
                select 1 from runs r2
                 where r2.user_id = r.user_id
                   and (
                     r2.${col} > r.${col}
                     or (r2.${col} = r.${col} and r2.ended_at < r.ended_at)
                   )
              )
        order by ${ORDER[board]}
        limit $1 offset $2`,
      [limit, offset],
    );
    return r.rows.map((row, i) => ({
      rank: offset + i + 1,
      nickname: row.nickname,
      ending: row.ending,
      realm: Number(row.realm),
      age: Number(row.age),
      score: Number(row.score),
      endedAt: new Date(row.ended_at).toISOString(),
    }));
  },

  async countByUser(db: Db, userId: string): Promise<number> {
    const r = await db.query<{ n: string | number }>(
      'select count(*) as n from runs where user_id = $1',
      [userId],
    );
    return Number(r.rows[0]?.n ?? 0);
  },

  /** 自己的历史，按时间倒序。与榜单不同：这里要全量，不只取最好那条。 */
  async listByUser(db: Db, userId: string, limit = 20): Promise<RunRow[]> {
    const r = await db.query<RunRow>(
      `select id, user_id, seed, ending, realm, age, score, verified, ended_at
         from runs where user_id = $1
        order by ended_at desc
        limit $2`,
      [userId, limit],
    );
    return r.rows;
  },
};

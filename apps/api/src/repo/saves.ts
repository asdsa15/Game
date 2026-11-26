import { randomUUID } from 'node:crypto';
import type { Db } from '../db.ts';
import { conflict } from '../lib/errors.ts';
import type { SaveV2 } from '../lib/save.ts';

export interface SaveSummary {
  slot: number;
  version: number;
  contentVersion: string;
  seed: string;
  meta: Record<string, unknown>;
  updatedAt: string;
}

export interface SaveRow extends SaveSummary {
  id: string;
  userId: string;
  state: Record<string, unknown>;
}

const toSummary = (r: Record<string, unknown>): SaveSummary => ({
  slot: Number(r.slot),
  version: Number(r.version),
  contentVersion: String(r.content_version),
  seed: String(r.seed),
  meta: (r.meta ?? {}) as Record<string, unknown>,
  updatedAt: new Date(r.updated_at as string | Date).toISOString(),
});

export const saves = {
  async list(db: Db, userId: string): Promise<SaveSummary[]> {
    const r = await db.query(
      `select slot, version, content_version, seed, meta, updated_at
         from saves where user_id = $1 order by slot asc`,
      [userId],
    );
    return r.rows.map(toSummary);
  },

  async get(db: Db, userId: string, slot: number): Promise<{ summary: SaveSummary; state: Record<string, unknown> } | null> {
    const r = await db.query(
      `select id, slot, version, content_version, seed, meta, state, updated_at
         from saves where user_id = $1 and slot = $2`,
      [userId, slot],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      summary: toSummary(row),
      state: (row.state ?? {}) as Record<string, unknown>,
    };
  },

  /**
   * 乐观锁写入。
   * expected=null 表示"我不知道服务器上是第几版"——新建时允许，更新时视为放弃检查（客户端强制覆盖）。
   * 有 expected 且与库里不一致 → 409，把当前版本回给客户端，让玩家自己选"覆盖"还是"另存"。
   */
  async upsert(
    db: Db,
    input: { userId: string; slot: number; expected: number | null; save: SaveV2 },
  ): Promise<{ version: number; updatedAt: string; created: boolean }> {
    const { userId, slot, expected, save } = input;
    return db.tx(async tx => {
      const cur = await tx.query<{ id: string; version: number }>(
        'select id, version from saves where user_id = $1 and slot = $2 for update',
        [userId, slot],
      );
      const row = cur.rows[0];
      const stateJson = JSON.stringify(save.state);
      const metaJson = JSON.stringify(save.meta ?? {});

      if (!row) {
        const id = randomUUID();
        const ins = await tx.query<{ version: number; updated_at: string | Date }>(
          `insert into saves (id, user_id, slot, version, content_version, seed, state, meta)
           values ($1, $2, $3, 1, $4, $5, $6::jsonb, $7::jsonb)
           returning version, updated_at`,
          [id, userId, slot, save.contentVersion, save.seed, stateJson, metaJson],
        );
        const created = ins.rows[0];
        if (!created) throw new Error('写入存档失败');
        return { version: Number(created.version), updatedAt: new Date(created.updated_at).toISOString(), created: true };
      }

      if (expected !== null && expected !== Number(row.version)) {
        throw conflict('SAVE_CONFLICT', '存档版本冲突：服务器上是第 ' + row.version + ' 版', {
          currentVersion: Number(row.version),
        });
      }

      const upd = await tx.query<{ version: number; updated_at: string | Date }>(
        `update saves
            set version = version + 1,
                content_version = $3,
                seed = $4,
                state = $5::jsonb,
                meta = $6::jsonb,
                updated_at = now()
          where id = $1 and user_id = $2
          returning version, updated_at`,
        [row.id, userId, save.contentVersion, save.seed, stateJson, metaJson],
      );
      const after = upd.rows[0];
      if (!after) throw new Error('更新存档失败');
      return { version: Number(after.version), updatedAt: new Date(after.updated_at).toISOString(), created: false };
    });
  },

  async remove(db: Db, userId: string, slot: number): Promise<boolean> {
    const r = await db.query('delete from saves where user_id = $1 and slot = $2', [userId, slot]);
    return r.rowCount > 0;
  },
};

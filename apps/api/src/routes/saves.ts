import { z } from 'zod';
import { saves } from '../repo/saves.ts';
import { SaveV2Schema, normalizeSave, pickMeta } from '../lib/save.ts';
import { notFound, tooLarge } from '../lib/errors.ts';
import { type Deps, type Register, parseBody, requireAuth } from './_shared.ts';

const SlotParams = z.object({ slot: z.coerce.number().int().min(0).max(9) });

/** If-Match: "3" / 3 / W/"3" 都认，解析不出来就当作没给 */
function parseIfMatch(header: string | undefined): number | null {
  if (!header) return null;
  const m = /(\d+)/.exec(header);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const registerSaveRoutes: Register = (app, deps: Deps) => {
  app.get('/saves', async (req) => {
    const claims = await requireAuth(req, deps);
    return { saves: await saves.list(deps.db, claims.sub) };
  });

  app.get('/saves/:slot', async (req) => {
    const claims = await requireAuth(req, deps);
    const { slot } = parseBody(SlotParams, req.params);
    const got = await saves.get(deps.db, claims.sub, slot);
    if (!got) throw notFound('SAVE_NOT_FOUND', '这个槽位还没有存档');
    return { ...got.summary, state: got.state };
  });

  /** 严格模式：只收 wendao-save v2。旧档走 /import。 */
  app.put('/saves/:slot', async (req, reply) => {
    const claims = await requireAuth(req, deps);
    const { slot } = parseBody(SlotParams, req.params);
    const body = parseBody(SaveV2Schema, req.body);

    const bytes = Buffer.byteLength(JSON.stringify(body.state));
    if (bytes > deps.config.saveBytesMax) {
      throw tooLarge('SAVE_TOO_LARGE', `存档过大：${bytes} 字节，上限 ${deps.config.saveBytesMax}`);
    }

    const expected = parseIfMatch(req.headers['if-match'] as string | undefined);
    const out = await saves.upsert(deps.db, {
      userId: claims.sub,
      slot,
      expected,
      save: { ...body, meta: body.meta ?? pickMeta(body.state) },
    });
    reply.code(out.created ? 201 : 200);
    return { slot, version: out.version, updatedAt: out.updatedAt, created: out.created };
  });

  /**
   * 旧档导入：收 wxcs3-save 信封 / 裸 state，规整成 v2 后强制覆盖该槽位。
   * 强制覆盖是刻意的——导入的语义就是"用这个档替换"；要保守请用 PUT + If-Match。
   */
  app.post('/saves/:slot/import', async (req, reply) => {
    const claims = await requireAuth(req, deps);
    const { slot } = parseBody(SlotParams, req.params);
    const { save, from } = normalizeSave(req.body);

    const bytes = Buffer.byteLength(JSON.stringify(save.state));
    if (bytes > deps.config.saveBytesMax) {
      throw tooLarge('SAVE_TOO_LARGE', `存档过大：${bytes} 字节，上限 ${deps.config.saveBytesMax}`);
    }

    const out = await saves.upsert(deps.db, {
      userId: claims.sub,
      slot,
      expected: null,
      save: { ...save, meta: save.meta ?? pickMeta(save.state) },
    });
    reply.code(out.created ? 201 : 200);
    return {
      slot,
      version: out.version,
      updatedAt: out.updatedAt,
      migratedFrom: from,
      meta: save.meta ?? {},
    };
  });

  app.delete('/saves/:slot', async (req, reply) => {
    const claims = await requireAuth(req, deps);
    const { slot } = parseBody(SlotParams, req.params);
    const ok = await saves.remove(deps.db, claims.sub, slot);
    if (!ok) throw notFound('SAVE_NOT_FOUND', '这个槽位本来就没有存档');
    reply.code(204);
    return null;
  });
};

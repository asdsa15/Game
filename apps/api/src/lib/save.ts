import { z } from 'zod';
import { badRequest } from './errors.ts';

/**
 * 存档信封。
 *
 * 设计要点：**state 不做字段级校验**。
 * 规则内核（packages/core）还没定稿，服务端此刻若强校验 S 的 210 个字段，
 * 每加一个玩法就要改一次服务端——这正是要避免的耦合。
 * 服务端只认信封：格式、版本、种子、时间、体积。
 * 等 core 落地后，把 GameState 的 zod schema 引进来做"可选严格模式"即可，接口不变。
 */
export const SAVE_V2 = 'wendao-save';

export const SaveV2Schema = z.object({
  format: z.literal(SAVE_V2),
  version: z.literal(2),
  contentVersion: z.string().min(1).max(64),
  savedAt: z.number().int().nonnegative(),
  seed: z.string().min(1).max(128),
  state: z.record(z.unknown()),
  meta: z.record(z.unknown()).optional(),
});

export type SaveV2 = z.infer<typeof SaveV2Schema>;

/** 旧版信封（v6~v11 一直在用） */
const LegacyEnvelope = z.object({
  format: z.literal('wxcs3-save'),
  version: z.union([z.string(), z.number()]),
  savedAt: z.number().optional(),
  state: z.record(z.unknown()),
});

interface MigrateResult {
  save: SaveV2;
  /** 记录来源，写进日志便于排查"某个老档为什么异常" */
  from: string;
}

export function pickMeta(state: Record<string, unknown>): Record<string, unknown> {
  const n = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : undefined;
  const s = (v: unknown): string | undefined => (typeof v === 'string' && v ? v.slice(0, 64) : undefined);

  const meta: Record<string, unknown> = {};
  const dao = s(state.dao) ?? s(state.name);
  if (dao) meta.dao = dao;
  const realm = n(state.xRealm) ?? n(state.pillar);
  if (realm !== undefined) meta.realm = realm;
  const age = n(state.age);
  if (age !== undefined) meta.age = age;
  const turn = n(state.turn);
  if (turn !== undefined) meta.turn = turn;
  const cult = s(state.cultivation);
  if (cult) meta.cultivation = cult;
  return meta;
}

/**
 * 把任何历史形态的存档规整成 SaveV2。支持三种输入：
 *   1) 已是 SaveV2
 *   2) 旧版 wxcs3-save 信封（version 为 '10.2' 这类字符串）
 *   3) 裸 state（早期手工导出过这种）
 * 不做静默兜底：认不出来就 400，并说明缺什么。旧版靠"字段已兜底"吞掉未知版本，
 * 结果是玩家以为存上了，其实读不回来。
 */
export function normalizeSave(raw: unknown): MigrateResult {
  const asV2 = SaveV2Schema.safeParse(raw);
  if (asV2.success) {
    return { save: asV2.data, from: 'v2' };
  }

  const asLegacy = LegacyEnvelope.safeParse(raw);
  if (asLegacy.success) {
    const l = asLegacy.data;
    const ver = String(l.version);
    const seedRaw = l.state.seed;
    const seed = typeof seedRaw === 'number' || typeof seedRaw === 'string'
      ? String(seedRaw)
      : `legacy:${ver}`;                 // 极老存档不存种子，用版本号派生，保证可读档但不承诺可复现
    return {
      save: {
        format: SAVE_V2,
        version: 2,
        contentVersion: `legacy/${ver}`,
        savedAt: l.savedAt ?? Date.now(),
        seed,
        state: l.state,
        meta: pickMeta(l.state),
      },
      from: `legacy/${ver}`,
    };
  }

  // 裸 state：必须至少像一局游戏（有 seed 或 xRealm），否则拒绝
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ('seed' in obj || 'xRealm' in obj || 'pillar' in obj) {
      return {
        save: {
          format: SAVE_V2,
          version: 2,
          contentVersion: 'legacy/bare',
          savedAt: Date.now(),
          seed: String(obj.seed ?? 'legacy:bare'),
          state: obj,
          meta: pickMeta(obj),
        },
        from: 'legacy/bare',
      };
    }
  }

  throw badRequest('SAVE_UNRECOGNIZED', '存档格式无法识别：需要 wendao-save v2 或旧版 wxcs3-save 信封');
}

export function isMissingSeed(save: SaveV2): boolean {
  return save.seed.startsWith('legacy:');
}

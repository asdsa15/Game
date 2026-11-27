import { z } from 'zod';

/**
 * 存档信封（跨端唯一真源）。
 *
 * 三条设计约束，与 `apps/api/src/lib/save.ts` 完全一致：
 *
 * 1. **信封管版本，state 管内容**。服务端只校验信封（format / version / seed / savedAt / 体积），
 *    不解析 state 的二百多个字段——否则每加一个玩法都要改服务端。
 * 2. `state` 在这里是 `record`，不是 `GameState`。内核的 `parseSave()` 会再校验一层，
 *    这样"信封合法但内容坏了"能给出不同的错误码。
 * 3. 旧版 `wxcs3-save` 只被 `LegacySaveEnvelope` 认得，不做静默兜底：
 *    认不出来要明确报错，不能"存上了但读不回来"。
 */

export const SAVE_FORMAT_V2 = 'wendao-save';
export const SAVE_FORMAT_LEGACY = 'wxcs3-save';
export const SAVE_VERSION_V2 = 2;

const ContentVersion = z.string().min(1).max(64);
const Seed = z.string().min(1).max(128);

export const SaveEnvelopeV2Schema = z.object({
  format: z.literal(SAVE_FORMAT_V2),
  version: z.literal(SAVE_VERSION_V2),
  contentVersion: ContentVersion,
  savedAt: z.number().int().nonnegative(),
  seed: Seed,
  /** 内核状态。信封层不解析；`@wendao/core` 的 parseSave 负责字段级校验。 */
  state: z.record(z.unknown()),
  /** 列表页用的摘要（道号 / 境界 / 年龄 / 回合），免得解包整份存档 */
  meta: z.record(z.unknown()).optional(),
});

export type SaveEnvelopeV2 = z.infer<typeof SaveEnvelopeV2Schema>;

/** 旧版信封（v6~v11 一直在用，version 是 '10.2' 这类字符串） */
export const LegacySaveEnvelopeSchema = z.object({
  format: z.literal(SAVE_FORMAT_LEGACY),
  version: z.union([z.string(), z.number()]),
  savedAt: z.number().optional(),
  state: z.record(z.unknown()),
});

export type LegacySaveEnvelope = z.infer<typeof LegacySaveEnvelopeSchema>;

/** 云存档槽位：0 = 自动，1~3 = 手动（与 api 的 SlotParams 对齐） */
export const SaveSlotSchema = z.coerce.number().int().min(0).max(9);
export type SaveSlot = z.infer<typeof SaveSlotSchema>;

export const SaveSummarySchema = z.object({
  slot: SaveSlotSchema,
  version: z.number().int().positive(),
  contentVersion: ContentVersion,
  savedAt: z.number().int().nonnegative(),
  meta: z.record(z.unknown()),
  updatedAt: z.string(),
});

export type SaveSummary = z.infer<typeof SaveSummarySchema>;

/**
 * 从任意历史形态的 state 里摘出列表页要用的摘要。
 *
 * 只读不写、只截断不改写：摘要是"给列表看的快照"，不是第二份状态。
 * 旧档字段名以 `wxcs3-game.js` 的 S 为准（`dao` / `xRealm` / `pillar` / `age` / `turn`）。
 */
export function pickSaveMeta(state: Record<string, unknown>): Record<string, unknown> {
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : undefined;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v.slice(0, 64) : undefined;

  const meta: Record<string, unknown> = {};
  const dao = str(state.dao) ?? str(state.name);
  if (dao) meta.dao = dao;
  const realm = num(state.xRealm) ?? num(state.pillar);
  if (realm !== undefined) meta.realm = realm;
  const age = num(state.age);
  if (age !== undefined) meta.age = age;
  const turn = num(state.turn);
  if (turn !== undefined) meta.turn = turn;
  const cultivation = str(state.cultivation);
  if (cultivation) meta.cultivation = cultivation;
  return meta;
}

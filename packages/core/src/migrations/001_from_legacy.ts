import { seedToInt } from '../engine/rng.ts';
import { STATE_FORMAT, STATE_VERSION, PHASES, type Phase } from '../state/types.ts';
import type { Migration } from './index.ts';

/**
 * 001 · 旧档（`wxcs3-save` 的 state）→ 新外壳 v1。
 *
 * 这一版**只搬外壳**：版本、种子、随机数游标、时间、阶段。
 * 旧 state 的 210 个字段原样塞进 `domains.legacy`，一个不丢、一个不改。
 * 理由：P1b 阶段各域还没有落位，现在强行拆字段，等于把旧形状抄进新结构，
 * 之后每搬一个域就要再修一次迁移。整包先带着走，P2 起逐域搬出并递增版本。
 *
 * 一个容易漏的细节：**随机数游标**。旧版 `setSeed(n)` 直接 `mulberry32(n)`，
 * 也就是状态就等于种子本身；只要旧档的 seed 是整数，这里必须用同一个数，
 * 否则"读档后继续玩"的随机序列会在第一步就与旧版分叉。
 */
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function normalizePhase(value: unknown, started: boolean): Phase {
  if (typeof value === 'string' && (PHASES as readonly string[]).includes(value)) {
    return value as Phase;
  }
  return started ? 'play' : 'create';
}

export const m001FromLegacy: Migration = {
  from: 0,
  to: 1,
  name: '001_from_legacy',
  up(input, ctx) {
    const legacy = input as Record<string, unknown>;
    const started = !!legacy.started;

    const rawSeed = legacy.seed ?? ctx.seed;
    const seedIsInt = typeof rawSeed === 'number' && Number.isFinite(rawSeed);
    const seed = seedIsInt
      ? String(Math.trunc(rawSeed as number))
      : String(rawSeed ?? `legacy:${ctx.from}`);

    const meta = {
      format: STATE_FORMAT,
      stateVersion: STATE_VERSION,
      contentVersion: ctx.contentVersion,
      seed,
      rngState: seedIsInt ? Math.trunc(rawSeed as number) >>> 0 : seedToInt(seed),
      // 旧档没有记录"已经掷了几次"，只能从 0 起算。它只用于诊断，不参与随机数本身
      rngDraws: 0,
      turn: Math.max(0, num(legacy.turn, 0)),
      year: num(legacy.year, 387),
      month: clamp(num(legacy.month, 1), 1, 12),
      xun: clamp(num(legacy.xun, 0), 0, 2),
      phase: normalizePhase(legacy.phase, started),
      started,
      createdAt: ctx.savedAt,
      importedFrom: ctx.from,
    };

    return { meta, domains: { legacy } };
  },
};

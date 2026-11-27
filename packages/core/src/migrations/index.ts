import { CoreError } from '../errors.ts';
import { isGameState, parseGameState, STATE_VERSION, type GameState } from '../state/types.ts';
import { m001FromLegacy } from './001_from_legacy.ts';

/**
 * 迁移链。
 *
 * 旧版靠"字段已兜底"容忍版本不符（`wxcs3-rules.js:117`）：任何不认识的存档都放行，
 * 缺字段就补默认值。短时间很省事，长期是存档事故的温床——玩家存的是 A 局，
 * 读回来是 B 局，而且没有任何一处会报错。
 *
 * 新规则：**每次都跑显式的链，跑不动就报错**。
 *   · 每条迁移只负责 `from → from+1`，不跳版本，也不猜。
 *   · 新加一个域就加一条 `00X_xxx.ts`，`stateVersion` +1，旧档自动顺着链爬上来。
 *   · 链条缺环 = 明确报 `SAVE_VERSION_UNSUPPORTED`，绝不"就地兜底"。
 */
export interface MigrateContext {
  /** 这一档是哪个内容版本打出来的（'legacy/10.2' / 'legacy/bare' / v2 自带的值） */
  contentVersion: string;
  /** 存档时间，用作 `meta.createdAt`，避免迁移里读真时钟导致结果不可复现 */
  savedAt: number;
  /** 来源标记，写进 meta.importedFrom */
  from: string;
  /** 信封里带的种子（旧 state 里没有种子时用它） */
  seed?: string;
}

export interface Migration {
  from: number;
  to: number;
  name: string;
  up: (input: Record<string, unknown>, ctx: MigrateContext) => Record<string, unknown>;
}

export const MIGRATIONS: readonly Migration[] = [m001FromLegacy];

function versionOf(input: unknown): number {
  if (input && typeof input === 'object') {
    const meta = (input as { meta?: { stateVersion?: unknown } }).meta;
    const v = meta?.stateVersion;
    if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  }
  return 0; // 没有外壳 = 旧档
}

/** 把任意历史形态的 state 爬到当前版本，并在出口做一次完整校验。 */
export function migrateState(input: unknown, ctx: MigrateContext): GameState {
  if (isGameState(input)) return input;

  let current = input as Record<string, unknown>;
  let version = versionOf(input);

  if (version > STATE_VERSION) {
    throw new CoreError(
      'SAVE_VERSION_UNSUPPORTED',
      `存档版本 ${version} 高于本程序支持的 ${STATE_VERSION}：这是更新版本打出来的档，先升级程序再读`,
    );
  }

  while (version < STATE_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) {
      throw new CoreError(
        'SAVE_VERSION_UNSUPPORTED',
        `迁移链缺环：没有 from=${version} 的迁移（当前目标 ${STATE_VERSION}）`,
      );
    }
    const next = step.up(current, { ...ctx, seed: ctx.seed });
    const nextVersion = versionOf(next);
    if (nextVersion !== step.to) {
      throw new CoreError(
        'SAVE_STATE_INVALID',
        `迁移 ${step.name} 声称到 v${step.to}，实际产出 v${nextVersion}`,
      );
    }
    current = next;
    version = nextVersion;
  }

  try {
    return parseGameState(current);
  } catch (error) {
    throw new CoreError('SAVE_STATE_INVALID', '迁移后的状态不合 schema', error);
  }
}

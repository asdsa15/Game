import { systemNow } from './engine/clock.ts';
import { seedToInt } from './engine/rng.ts';
import { STATE_FORMAT, STATE_VERSION, type GameState } from './state/types.ts';

/**
 * 创建一局空状态。
 *
 * P1b 只做"外壳"：版本、种子、随机数游标、时间、阶段。
 * 创角（灵根 / 天赋 / 出身 / 道途）是 P3 的前端流程 + P2 的 `create` 命令，
 * 这里**不许**先塞一份假初始值——那会让"创角到底做了什么"在新架构里查无实据。
 */
export interface CreateGameOptions {
  seed: string;
  contentVersion: string;
  /** 时间注入；测试用固定值，产物才可复现 */
  now?: number;
  /** 开局年份（旧版是天玄历 387 年）。放参数里是为了让黄金样本能对齐历法 */
  startYear?: number;
}

export function createGame(options: CreateGameOptions): GameState {
  const seed = options.seed.trim();
  if (!seed) throw new Error('createGame：seed 不能为空');
  if (!options.contentVersion) throw new Error('createGame：contentVersion 不能为空');

  return {
    meta: {
      format: STATE_FORMAT,
      stateVersion: STATE_VERSION,
      contentVersion: options.contentVersion,
      seed,
      // 随机数游标初值就是种子本身；mulberry32 的第一次 next() 会把它推进
      rngState: seedToInt(seed),
      rngDraws: 0,
      turn: 0,
      year: options.startYear ?? 387,
      month: 1,
      xun: 0,
      phase: 'create',
      started: false,
      createdAt: options.now ?? systemNow(),
    },
    domains: {},
  };
}

import {
  apply,
  cmdAdvanceXun,
  cmdStart,
  createGame,
  hashState,
  type GameEvent,
  type GameState,
} from '@wendao/core';

/**
 * 无头模拟：不开浏览器、不碰 DOM，只把状态往前推。
 *
 * P1b 阶段它只做"跑 N 旬、统计事件"，但接口刻意按黄金样本（方案 §8.1）的形状定：
 * 给定 seed 与步数就产出一个可复现的终态指纹，将来八条剧本只是换指令序列。
 *
 * 为什么现在就做：没有无头跑法，重构期的"行为漂移"只能靠人肉点；
 * 有了它，P2 每搬一个域就能加一条断言——`hashState()` 与旧版对齐。
 */
export interface HeadlessOptions {
  seed: string;
  contentVersion?: string;
  /** 总共推进几旬 */
  steps?: number;
  now?: number;
}

export interface HeadlessResult {
  state: GameState;
  events: GameEvent[];
  /** 终态指纹：两份结果一样 → 这一局跑得一模一样 */
  hash: string;
  /** 事件计数，按类型 */
  counts: Record<string, number>;
}

export function runHeadless(options: HeadlessOptions): HeadlessResult {
  const steps = Math.max(0, Math.trunc(options.steps ?? 12));
  const now = options.now ?? 0;
  const contentVersion = options.contentVersion ?? '0.1.0';

  let state = createGame({ seed: options.seed, contentVersion, now });
  const events: GameEvent[] = [];

  const started = apply(state, cmdStart);
  state = started.state;
  events.push(...started.events);

  for (let i = 0; i < steps; i++) {
    const tick = apply(state, cmdAdvanceXun, { n: 1 });
    state = tick.state;
    events.push(...tick.events);
  }

  const counts: Record<string, number> = {};
  for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1;

  return { state, events, hash: hashState(state), counts };
}

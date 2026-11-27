import type { GameEvent } from './events.ts';
import type { Rng } from './rng.ts';
import type { GameState } from '../state/types.ts';

/**
 * 命令上下文。
 *
 * 这是整个内核唯一的"可写面"：命令想改状态只能通过 `ctx.s`，
 * 想掷骰只能通过 `ctx.rng`，想告诉外面发生了什么只能通过 `ctx.emit`。
 * 三样东西都在这里，于是"哪些代码碰了随机数"是能用 grep 回答的问题。
 */
export interface CmdCtx {
  /** 可变草稿。只在本次 apply 内有效，apply 结束后它已经是一个新快照 */
  s: GameState;
  /** 只读内容表（116 张）。P1b 阶段命令用不到，P2 起按域使用 */
  c: Readonly<Record<string, unknown>>;
  /** 唯一随机源 */
  rng: Rng;
  /** 事件出口 */
  emit: (event: GameEvent) => void;
  /** 时间注入：测试可冻结，规则层不许直接 Date.now() */
  now: () => number;
}

export type Command<A = undefined> = [A] extends [undefined]
  ? (ctx: CmdCtx, args?: undefined) => void
  : (ctx: CmdCtx, args: A) => void;

import { systemNow } from './clock.ts';
import type { CmdCtx, Command } from './ctx.ts';
import type { GameEvent } from './events.ts';
import { makeRng } from './rng.ts';
import { parseGameState, type GameState } from '../state/types.ts';

/**
 * 唯一入口：进一个快照，出一个新快照 + 一串事件。
 *
 * 三条性质，都是测试直接断言的：
 *   1. **不原地改**：入参 state 在整个过程中一个字节都不变（命令拿到的是克隆）。
 *   2. **同 seed 同结果**：同状态 + 同命令 + 同参数 → `hashState()` 相同。
 *      P4b 的服务端重放校验就靠这条。
 *   3. **出错不留脏**：命令抛错时，旧快照仍然完好——没有"改了一半"的状态。
 *
 * 为什么不用纯 reducer：旧版 195 个 ACT 全是"直接改 S + 顺手渲染"，
 * 硬改成不可变要动两千多处引用。可变草稿（拿克隆当 draft）既能保留旧写法，
 * 又能在边界上给出不可变语义——这是这次重构唯一省下来的力气。
 * （方案里写的是 immer；实测 GameState 是纯 JSON，`structuredClone` 足够，
 *  少一个依赖、少一层 Proxy 开销。P2 若出现巨型状态再换 immer，接口不变。）
 */

export interface ApplyOptions {
  /** 内容表（116 张）。不传就是空表——P1b 的骨架命令不需要内容 */
  content?: Readonly<Record<string, unknown>>;
  /** 时间注入，测试可冻结 */
  now?: () => number;
  /** 是否在出口再做一次 schema 校验。默认开：宁可慢一点，也别让坏状态流出去 */
  validate?: boolean;
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

const EMPTY_CONTENT: Readonly<Record<string, unknown>> = Object.freeze({});

export function apply<A = undefined>(
  state: GameState,
  cmd: Command<A>,
  args?: A,
  opts: ApplyOptions = {},
): ApplyResult {
  const draft = structuredClone(state);
  const events: GameEvent[] = [];
  const rng = makeRng(draft.meta.rngState);

  const ctx: CmdCtx = {
    s: draft,
    c: opts.content ?? EMPTY_CONTENT,
    rng,
    emit: (event) => events.push(event),
    now: opts.now ?? systemNow,
  };

  // 命令在这里跑。抛错就让它抛——调用方拿到的旧快照仍然完好
  (cmd as (c: CmdCtx, a?: A) => void)(ctx, args);

  draft.meta.rngState = rng.state();
  draft.meta.rngDraws += rng.draws();

  const next = opts.validate === false ? draft : parseGameState(draft);
  return { state: next, events };
}

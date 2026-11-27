/**
 * 事件流。
 *
 * 旧版 294 处 `logLine` 同时干三件事：写日志、写年谱、决定颜色。
 * 三者混在一起，于是"想给战斗加一条战报"必须动 UI，"想给后端留一份年谱"改不动。
 *
 * 新内核里命令只 `emit`，谁消费由宿主决定：
 *   · 前端：log 事件 → 纪事条目 / 战况 / toast
 *   · 服务端：可选落库做年谱云备份、统计卡点
 *   · 测试：直接断言事件序列，不用 DOM
 *
 * 事件类型刻意保持"少而稳"。加新类型是为了让宿主**做新事**，
 * 不是为了把 UI 的细节塞进规则层——那正是要拆开的东西。
 */

import type { Phase } from '../state/types.ts';

export const LOG_CATEGORIES = [
  'combat',
  'cult',
  'craft',
  'trade',
  'npc',
  'enc',
  'story',
  'misc',
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

export type GameEvent =
  /** 一条纪事。`cls` 是旧版的 good / danger / ''，保留以免迁移期改 294 处调用点 */
  | { type: 'log'; text: string; cat: LogCategory; cls?: '' | 'good' | 'danger' }
  /** 过了一旬 */
  | { type: 'xun'; xun: number; turn: number }
  /** 过了一月（跨旬触发；寿元、家族、行情这些"按月"的事在 P2 挂这里） */
  | { type: 'month'; year: number; month: number; turn: number }
  /** 阶段切换（create → play → combat …） */
  | { type: 'phase'; from: Phase; to: Phase }
  /** 顺手记一笔标记，供后续事件用 when.flag 判断 */
  | { type: 'flag'; key: string; value: unknown };

export type GameEventType = GameEvent['type'];

/** 按类型过滤，宿主与测试都用它，免得各写一遍 switch */
export function eventsOfType<T extends GameEventType>(
  events: readonly GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

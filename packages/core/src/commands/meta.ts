import type { Command } from '../engine/ctx.ts';
import type { LogCategory } from '../engine/events.ts';
import { XUN_PER_MONTH } from '../state/types.ts';

/**
 * 元系统命令（P1b 只有这几个，用来证明"命令 → 新状态 + 事件流"这条管道真的通）。
 *
 * 它们**刻意不含任何玩法数值**：加时间、写纪事、记标记。
 * 打坐给多少修为、破境成功率多少，属于 P2a，不在这一批里发明。
 */

function requirePlayable(ctx: { s: { meta: { phase: string; started: boolean } } }): void {
  const { phase, started } = ctx.s.meta;
  if (!started || phase !== 'play') {
    throw new Error(`命令需要 play 阶段（当前 ${phase}）`);
  }
}

/** 开始这一局：create → play。旧版创角结束时的 `finishCreate()` 对应这里 */
export const cmdStart: Command = (ctx) => {
  const meta = ctx.s.meta;
  if (meta.phase !== 'create')
    throw new Error(`cmdStart 只能在 create 阶段调用（当前 ${meta.phase}）`);
  meta.started = true;
  meta.phase = 'play';
  ctx.emit({ type: 'phase', from: 'create', to: 'play' });
};

/**
 * 过 N 旬。**全项目唯一的时间入口**（旧版 `advanceXun`）。
 *
 * 跨旬不结算世界，跨月才升 `turn`/`month`：寿元、家族、行情这些"按月"的事
 * 在 P2 挂到 `month` 事件上，不拆成三次。
 */
export const cmdAdvanceXun: Command<{ n?: number }> = (ctx, args) => {
  requirePlayable(ctx);
  const raw = args?.n ?? 1;
  const n = Math.max(1, Math.min(12, Math.trunc(raw) || 1));
  const meta = ctx.s.meta;

  for (let i = 0; i < n; i++) {
    meta.xun += 1;
    if (meta.xun >= XUN_PER_MONTH) {
      meta.xun = 0;
      meta.turn += 1;
      meta.month += 1;
      if (meta.month > 12) {
        meta.month = 1;
        meta.year += 1;
      }
      ctx.emit({ type: 'month', year: meta.year, month: meta.month, turn: meta.turn });
    } else {
      ctx.emit({ type: 'xun', xun: meta.xun, turn: meta.turn });
    }
  }
};

/**
 * 写一条纪事。
 *
 * 旧版 `logLine` 直接 push 进 `S.log`；新内核改成发事件，由宿主决定落到哪。
 * 这样服务端也能拿到同一串纪事（年谱云备份），而规则层不知道"有没有 UI"。
 */
export const cmdLog: Command<{ text: string; cat?: LogCategory; cls?: '' | 'good' | 'danger' }> = (
  ctx,
  args,
) => {
  const text = args?.text?.trim();
  if (!text) throw new Error('cmdLog：text 不能为空');
  ctx.emit({ type: 'log', text, cat: args?.cat ?? 'misc', cls: args?.cls ?? '' });
};

/**
 * 记一个标记（旧版 `S.flags[key] = 1`，事件用 `when.flag` 读它）。
 *
 * 放进 `domains.flags` 而不是 `meta`：它属于玩法数据，不属于"这一局的身份"。
 */
export const cmdSetFlag: Command<{ key: string; value?: unknown }> = (ctx, args) => {
  const key = args?.key?.trim();
  if (!key) throw new Error('cmdSetFlag：key 不能为空');
  const flags = (ctx.s.domains.flags as Record<string, unknown>) ?? {};
  flags[key] = args?.value ?? 1;
  ctx.s.domains.flags = flags;
  ctx.emit({ type: 'flag', key, value: flags[key] });
};

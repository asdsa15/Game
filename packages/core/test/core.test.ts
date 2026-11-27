import { describe, expect, it } from 'vitest';
import {
  apply,
  cmdAdvanceXun,
  cmdLog,
  cmdSetFlag,
  cmdStart,
  createGame,
  eventsOfType,
  hashState,
  hashString,
  makeRng,
  seedToInt,
  stableStringify,
  type Command,
  type GameEvent,
  type GameState,
} from '../src/index.ts';

const NOW = 1_700_000_000_000;
const fresh = (seed = '20261121'): GameState =>
  createGame({ seed, contentVersion: '0.1.0', now: NOW });

describe('createGame', () => {
  it('同 seed + 同时间 → 完全相同（产物可复现）', () => {
    expect(fresh()).toEqual(fresh());
    expect(hashState(fresh())).toBe(hashState(fresh()));
  });

  it('起初是 create 阶段、未开始，随机数游标等于种子', () => {
    const s = fresh();
    expect(s.meta.phase).toBe('create');
    expect(s.meta.started).toBe(false);
    expect(s.meta.rngState).toBe(seedToInt('20261121'));
    expect(s.meta.rngDraws).toBe(0);
    expect(s.domains).toEqual({});
  });

  it('拒收空种子', () => {
    expect(() => createGame({ seed: '  ', contentVersion: '0.1.0' })).toThrow(/seed/);
  });
});

describe('apply：不可变边界', () => {
  it('不原地改入参，且返回新对象', () => {
    const s0 = fresh();
    const before = structuredClone(s0);
    const { state: s1 } = apply(s0, cmdStart);
    expect(s0).toEqual(before);
    expect(s1).not.toBe(s0);
    expect(s1.meta.phase).toBe('play');
    expect(s0.meta.phase).toBe('create');
  });

  it('命令抛错时旧快照完好，不会留下改了一半的状态', () => {
    const s0 = fresh();
    const before = structuredClone(s0);
    const explode: Command = (ctx) => {
      ctx.s.meta.year = 999;
      throw new Error('boom');
    };
    expect(() => apply(s0, explode)).toThrow('boom');
    expect(s0).toEqual(before);
  });

  it('阶段前置条件不满足时拒绝执行', () => {
    const s0 = fresh(); // 还是 create
    expect(() => apply(s0, cmdAdvanceXun, { n: 1 })).toThrow(/play/);
  });
});

describe('随机源：状态携带，同 seed 可复现', () => {
  /** 只掷三次、什么也不改：用来证明"随机数由状态携带"而不是模块变量 */
  const draw3: Command = (ctx) => {
    ctx.rng.next();
    ctx.rng.next();
    ctx.rng.next();
  };

  it('两次 apply 的随机序列完全一致', () => {
    const run = (seed: string) => {
      const rng = makeRng(seedToInt(seed));
      return [rng.next(), rng.next(), rng.next()];
    };
    expect(run('20261121')).toEqual(run('20261121'));
    expect(run('20261121')).not.toEqual(run('20261122'));
  });

  it('随机数游标写回状态，掷的次数可查', () => {
    const s0 = fresh();
    const { state: s1 } = apply(s0, draw3);
    expect(s1.meta.rngDraws).toBe(3);
    expect(s1.meta.rngState).not.toBe(s0.meta.rngState);

    // 从同一状态再跑一次，序列仍一致（游标来自状态，不来自模块变量）
    const a = apply(s1, draw3).state.meta.rngState;
    const b = apply(s1, draw3).state.meta.rngState;
    expect(a).toBe(b);
  });
});

describe('命令与事件流', () => {
  it('cmdStart 发出一次 phase 事件', () => {
    const { events, state } = apply(fresh(), cmdStart);
    expect(state.meta.started).toBe(true);
    expect(events).toEqual([{ type: 'phase', from: 'create', to: 'play' }]);
  });

  it('过三旬 = 两次 xun + 一次 month（跨月才升 turn）', () => {
    const s0 = apply(fresh(), cmdStart).state;
    const { state, events } = apply(s0, cmdAdvanceXun, { n: 3 });
    expect(eventsOfType(events, 'xun').map((e) => e.xun)).toEqual([1, 2]);
    expect(eventsOfType(events, 'month')).toHaveLength(1);
    expect(state.meta.xun).toBe(0);
    expect(state.meta.turn).toBe(1);
    expect(state.meta.month).toBe(2);
  });

  it('跨年：12 月过一旬回到 1 月并升年', () => {
    const base = apply(fresh(), cmdStart).state;
    const dec: GameState = { ...base, meta: { ...base.meta, month: 12, xun: 2 } };
    const { state } = apply(dec, cmdAdvanceXun, { n: 1 });
    expect(state.meta.month).toBe(1);
    expect(state.meta.year).toBe(base.meta.year + 1);
  });

  it('cmdLog 只发事件、不改状态（规则层不知道有没有 UI）', () => {
    const s0 = fresh();
    const { state, events } = apply(s0, cmdLog, { text: '进山采药一趟。', cat: 'craft' });
    expect(events).toEqual([{ type: 'log', text: '进山采药一趟。', cat: 'craft', cls: '' }]);
    expect(hashState(state)).toBe(hashState(s0));
  });

  it('cmdSetFlag 写进 domains.flags 并回吐事件', () => {
    const { state, events } = apply(fresh(), cmdSetFlag, { key: 'ancestor_reject' });
    expect(state.domains.flags).toEqual({ ancestor_reject: 1 });
    expect(events).toEqual([{ type: 'flag', key: 'ancestor_reject', value: 1 }]);
  });

  it('连跑三条命令：事件按序拼接，结果可复现', () => {
    const chain = (): { state: GameState; events: GameEvent[] } => {
      let state = fresh();
      const events: GameEvent[] = [];
      for (const step of [
        () => apply(state, cmdStart),
        () => apply(state, cmdAdvanceXun, { n: 2 }),
        () => apply(state, cmdLog, { text: '静坐。', cat: 'cult' as const }),
      ]) {
        const result = step();
        state = result.state;
        events.push(...result.events);
      }
      return { state, events };
    };
    const a = chain();
    const b = chain();
    expect(a.events.map((e) => e.type)).toEqual(['phase', 'xun', 'xun', 'log']);
    expect(hashState(a.state)).toBe(hashState(b.state));
    expect(a.state.meta.xun).toBe(2);
  });
});

describe('状态指纹', () => {
  it('键顺序不影响指纹', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(hashString('abc')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('任一字段变化都会改变指纹', () => {
    const s0 = fresh();
    const s1 = structuredClone(s0);
    s1.meta.turn += 1;
    expect(hashState(s1)).not.toBe(hashState(s0));
  });
});

import { describe, expect, it } from 'vitest';
import { runHeadless } from '../src/index.ts';

describe('无头模拟', () => {
  it('同 seed 同步数 → 同终态指纹', () => {
    const a = runHeadless({ seed: 'golden-xian-early', steps: 12, now: 0 });
    const b = runHeadless({ seed: 'golden-xian-early', steps: 12, now: 0 });
    expect(a.hash).toBe(b.hash);
    expect(a.state).toEqual(b.state);
  });

  it('不同 seed → 不同指纹（种子真的进了状态）', () => {
    const a = runHeadless({ seed: 'seed-a', steps: 6, now: 0 });
    const b = runHeadless({ seed: 'seed-b', steps: 6, now: 0 });
    expect(a.hash).not.toBe(b.hash);
  });

  it('12 旬 = 4 个月：month 事件 4 次、xun 事件 8 次', () => {
    const r = runHeadless({ seed: 'x', steps: 12, now: 0 });
    expect(r.counts.month).toBe(4);
    expect(r.counts.xun).toBe(8);
    expect(r.state.meta.turn).toBe(4);
  });

  it('事件流从一开始就有：phase 事件在最先', () => {
    const r = runHeadless({ seed: 'x', steps: 1, now: 0 });
    expect(r.events[0]).toEqual({ type: 'phase', from: 'create', to: 'play' });
  });
});

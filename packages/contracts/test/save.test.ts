import { describe, expect, it } from 'vitest';
import {
  LegacySaveEnvelopeSchema,
  SaveEnvelopeV2Schema,
  pickSaveMeta,
  type SaveEnvelopeV2,
} from '../src/index.ts';

const V2: SaveEnvelopeV2 = {
  format: 'wendao-save',
  version: 2,
  contentVersion: 'legacy/10.2',
  savedAt: 1_700_000_000_000,
  seed: '20261121',
  state: { xRealm: 3, dao: '沈砚' },
};

describe('存档信封', () => {
  it('收下合法 v2 信封', () => {
    expect(SaveEnvelopeV2Schema.safeParse(V2).success).toBe(true);
  });

  it('state 只要求是对象，不解析内部字段', () => {
    const ok = SaveEnvelopeV2Schema.safeParse({ ...V2, state: { anything: [1, 2, 3] } });
    expect(ok.success).toBe(true);
    const bad = SaveEnvelopeV2Schema.safeParse({ ...V2, state: 'not-an-object' });
    expect(bad.success).toBe(false);
  });

  it('拒收版本号不对或种子为空的信封', () => {
    expect(SaveEnvelopeV2Schema.safeParse({ ...V2, version: 1 }).success).toBe(false);
    expect(SaveEnvelopeV2Schema.safeParse({ ...V2, seed: '' }).success).toBe(false);
  });

  it('旧版 wxcs3-save 只被 Legacy 分支认得', () => {
    const legacy = { format: 'wxcs3-save', version: '10.2', state: { xRealm: 1 } };
    expect(LegacySaveEnvelopeSchema.safeParse(legacy).success).toBe(true);
    expect(SaveEnvelopeV2Schema.safeParse(legacy).success).toBe(false);
  });

  it('摘要只摘列表要用的几个字段，不做二次加工', () => {
    const meta = pickSaveMeta({ dao: '沈砚', xRealm: 3, age: 41, turn: 120, cultivation: 'xian' });
    expect(meta).toEqual({ dao: '沈砚', realm: 3, age: 41, turn: 120, cultivation: 'xian' });
    // 小数截断、超长字符串截断、缺字段就不写（不是写 null）
    expect(pickSaveMeta({ name: 'x'.repeat(100), pillar: 2.9 })).toEqual({
      dao: 'x'.repeat(64),
      realm: 2,
    });
    expect(pickSaveMeta({})).toEqual({});
  });
});

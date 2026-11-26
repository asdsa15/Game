import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password.ts';
import { makeTokens } from '../src/lib/tokens.ts';
import { normalizeSave, pickMeta, SaveV2Schema } from '../src/lib/save.ts';
import { computeScore, ENDING_BONUS } from '../src/lib/score.ts';

describe('口令散列', () => {
  it('同一口令两次散列不同（有盐），但都能验回来', async () => {
    const h1 = await hashPassword('password123');
    const h2 = await hashPassword('password123');
    expect(h1).not.toBe(h2);
    expect(await verifyPassword('password123', h1)).toBe(true);
    expect(await verifyPassword('password123', h2)).toBe(true);
  });

  it('错口令不通过', async () => {
    const h = await hashPassword('password123');
    expect(await verifyPassword('password124', h)).toBe(false);
    expect(await verifyPassword('', h)).toBe(false);
  });

  it('被篡改的散列串不通过，也不抛错', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$1$2$3$bad$bad')).toBe(false);
  });
});

describe('令牌', () => {
  const t = makeTokens('0123456789abcdef0123456789abcdef', 900);

  it('签发的 access 能验回来，载荷一致', async () => {
    const token = await t.signAccess({ sub: 'u1', role: 'player', nick: '无名' });
    const claims = await t.verifyAccess(token);
    expect(claims).toMatchObject({ sub: 'u1', role: 'player', nick: '无名' });
  });

  it('换密钥签的令牌验不过', async () => {
    const other = makeTokens('ffffffffffffffffffffffffffffffff', 900);
    const token = await other.signAccess({ sub: 'u1', role: 'player', nick: 'x' });
    await expect(t.verifyAccess(token)).rejects.toBeTruthy();
  });

  it('refresh 是随机串，只存散列且散列稳定', () => {
    const a = t.newRefresh();
    const b = t.newRefresh();
    expect(a).not.toBe(b);
    expect(t.hashRefresh(a)).toHaveLength(64);
    expect(t.hashRefresh(a)).toBe(t.hashRefresh(a));
    expect(t.hashRefresh(a)).not.toBe(t.hashRefresh(b));
  });
});

describe('存档规整', () => {
  it('已经是 v2：原样通过', () => {
    const v2 = {
      format: 'wendao-save', version: 2, contentVersion: '0.1.0',
      savedAt: 1, seed: 's', state: { xRealm: 1 },
    };
    const out = normalizeSave(v2);
    expect(out.from).toBe('v2');
    expect(out.save.seed).toBe('s');
  });

  it('旧信封：版本映射成 legacy/10.2，种子取自 state', () => {
    const out = normalizeSave({
      format: 'wxcs3-save', version: '10.2', savedAt: 123,
      state: { seed: 7788, xRealm: 4, dao: '老道', age: 88 },
    });
    expect(out.from).toBe('legacy/10.2');
    expect(out.save).toMatchObject({
      format: 'wendao-save', version: 2, contentVersion: 'legacy/10.2', savedAt: 123, seed: '7788',
    });
    expect(out.save.meta).toMatchObject({ dao: '老道', realm: 4, age: 88 });
  });

  it('旧档没存种子：用版本号派生，可读档但不承诺可复现', () => {
    const out = normalizeSave({ format: 'wxcs3-save', version: '9.1', state: { xRealm: 0 } });
    expect(out.save.seed).toBe('legacy:9.1');
  });

  it('裸 state 也认', () => {
    const out = normalizeSave({ seed: 5, pillar: 2 });
    expect(out.from).toBe('legacy/bare');
    expect(out.save.meta).toMatchObject({ realm: 2 });
  });

  it('认不出的输入直接抛 400，不静默兜底', () => {
    expect(() => normalizeSave({ foo: 1 })).toThrowError(/存档格式无法识别/);
    expect(() => normalizeSave(null)).toThrowError();
    expect(() => normalizeSave('string')).toThrowError();
  });

  it('pickMeta 只留可展示字段，且截断超长字符串', () => {
    const meta = pickMeta({ dao: 'x'.repeat(200), xRealm: 3.9, age: 20, 别的: 1 });
    expect(String(meta.dao)).toHaveLength(64);
    expect(meta.realm).toBe(3);        // 取整
    expect(meta).not.toHaveProperty('别的');
  });

  it('v2 schema 拒绝缺字段', () => {
    expect(SaveV2Schema.safeParse({ format: 'wendao-save', version: 2 }).success).toBe(false);
    expect(SaveV2Schema.safeParse({ format: 'wendao-save', version: 3 }).success).toBe(false);
  });
});

describe('计分', () => {
  it('公式：境界×1000 + 寿元×10 + 结局档次', () => {
    expect(computeScore({ realm: 5, age: 120, ending: 'guowei' })).toBe(7700);
    expect(computeScore({ realm: 0, age: 0, ending: 'fall' })).toBe(0);
  });

  it('未知结局按 0 分算（接口层会先拦掉）', () => {
    expect(computeScore({ realm: 1, age: 10, ending: 'unknown' })).toBe(1 * 1000 + 100);
  });

  it('负值不产生负分', () => {
    expect(computeScore({ realm: -3, age: -10, ending: 'fall' })).toBe(0);
  });

  it('十二个结局都登记了档次', () => {
    expect(Object.keys(ENDING_BONUS)).toHaveLength(12);
  });
});

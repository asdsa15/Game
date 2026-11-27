import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTENT, CONTENT_MANIFEST } from '../src/index.ts';

/**
 * 旧版对照：把 `wxcs3-data.js` 在 vm 里重新跑一遍，逐表深比对。
 *
 * 这是 P1a 的验收线（方案 §9 写的是"文本总量差 <1%"），这里做得更狠：
 * **逐表 deepEqual**。文本差 1% 允许丢 900 字——一句判词、一段诗，
 * 丢了玩家不会报错，只会觉得"这里怎么没味道了"。所以不给自己留这个口子。
 *
 * 等 P6 旧版下线，这个测试改成对签入的 fixture 快照比对。
 */
function loadLegacy(): Record<string, unknown> {
  const path = fileURLToPath(new URL('../../../wxcs3-data.js', import.meta.url));
  const code = fs.readFileSync(path, 'utf8');
  const sandbox: Record<string, unknown> = {
    window: {},
    console,
    Math,
    Object,
    Array,
    JSON,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'wxcs3-data.js', timeout: 20_000 });
  const data = (sandbox.window as { WXCS3_DATA?: Record<string, unknown> }).WXCS3_DATA;
  assert.ok(data, 'wxcs3-data.js 没有导出 WXCS3_DATA');
  return data;
}

describe('与旧版 wxcs3-data.js 的逐表对照', () => {
  const legacy = loadLegacy();

  it('表名集合完全一致（不多不少）', () => {
    expect(Object.keys(CONTENT).sort()).toEqual(Object.keys(legacy).sort());
  });

  it('每张表的深层内容与旧版完全相同', () => {
    for (const [name, value] of Object.entries(legacy)) {
      // 两边都过一遍 JSON：旧数据来自 vm 里的另一个 realm，直接 deepStrictEqual
      // 会因为 Object.prototype 不同而假失败；顺带也证明这些表全是纯 JSON（无函数/undefined）
      const expected = JSON.parse(JSON.stringify(value)) as unknown;
      assert.deepEqual(CONTENT[name], expected, `表 ${name} 与旧版不一致`);
    }
  });

  it('文本总量与旧版一致（逐字相同，不是差 1% 以内）', () => {
    let legacyChars = 0;
    const walk = (v: unknown): void => {
      if (typeof v === 'string') legacyChars += v.length;
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(legacy);
    expect(CONTENT_MANIFEST.textChars).toBe(legacyChars);
  });
});

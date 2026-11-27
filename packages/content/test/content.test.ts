import { describe, expect, it } from 'vitest';
import {
  CONTENT,
  CONTENT_MANIFEST,
  CONTENT_TABLE_NAMES,
  TABLE_SCHEMAS,
  validateContent,
} from '../src/index.ts';

const asArray = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : []);

describe('内容包结构', () => {
  it('116 张表，与清单一致', () => {
    expect(CONTENT_TABLE_NAMES.length).toBe(116);
    expect(Object.keys(CONTENT).length).toBe(116);
    expect(CONTENT_MANIFEST.tables).toBe(116);
  });

  it('每张表都有 schema，且表名集合与 schema 集合一致', () => {
    const schemaKeys = Object.keys(TABLE_SCHEMAS).sort();
    const contentKeys = Object.keys(CONTENT).sort();
    expect(schemaKeys).toEqual(contentKeys);
  });

  it('内容是深冻结的：规则层只能读', () => {
    expect(Object.isFrozen(CONTENT)).toBe(true);
    expect(Object.isFrozen(CONTENT.XIAN_REALMS)).toBe(true);
    const first = asArray(CONTENT.XIAN_REALMS)[0];
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('清单里的计数与真实数据对得上', () => {
    const { stats } = validateContent();
    expect(stats.tables).toBe(CONTENT_MANIFEST.tables);
    expect(stats.records).toBe(CONTENT_MANIFEST.records);
    expect(stats.textChars).toBe(CONTENT_MANIFEST.textChars);
  });
});

describe('内容语义校验', () => {
  it('0 个 issue（类型 / id 唯一 / 数值域 / 交叉引用）', () => {
    const { issues } = validateContent();
    expect(issues.map((i) => `[${i.table}] ${i.path}: ${i.message}`)).toEqual([]);
  });

  it('品相权重和恰好为 1', () => {
    const sum = asArray(CONTENT.QUALITY).reduce((acc, q) => acc + Number(q.rate ?? 0), 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });

  it('配方引用的材料全部存在（抽样验证校验器本身有效）', () => {
    const materials = new Set(asArray(CONTENT.MATERIAL_EXT).map((m) => m.id));
    for (const recipe of asArray(CONTENT.RECIPES)) {
      for (const key of Object.keys((recipe.mats as Record<string, number>) ?? {})) {
        expect(materials.has(key)).toBe(true);
      }
    }
  });

  it('校验器能抓到人为制造的坏数据（不是永远返回空）', () => {
    const broken = {
      ...CONTENT,
      QUALITY: [{ id: 'fei', rate: 0.5 }],
      RECIPES: [{ id: 'x', mats: { notARealMaterial: 1 }, out: 'nope' }],
    };
    const { issues } = validateContent(broken);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.table === 'QUALITY')).toBe(true);
    expect(issues.some((i) => i.table === 'RECIPES')).toBe(true);
  });
});

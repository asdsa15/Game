import { CONTENT } from './content.ts';
import { TABLE_SCHEMAS } from './schema.ts';

/**
 * 语义校验：类型管不到的那一半。
 *
 * 类型快照能保证"price 还是数字"，但保证不了"price 不是负数"，
 * 更保证不了"配方要的材料真的存在"。这一层逐条查后者，全部是**会真出事**的检查：
 *
 *   · id 重复      → 后一条静默覆盖前一条，玩家永远拿不到那件东西
 *   · 引用不存在   → 点了就报"材料不足"，其实是数据写错了名字
 *   · 价格为负     → 买一次倒赚灵石，经济曲线当场穿
 *   · 品相权重和≠1 → 高品质掉落率悄悄漂移
 *
 * 任何一条挂了都返回 issue（带表名与路径），由 CLI / 测试决定怎么报告。
 */

export interface Issue {
  table: string;
  path: string;
  message: string;
}

export interface ContentStats {
  tables: number;
  records: number;
  textChars: number;
}

type Dict = Record<string, unknown>;
/** 只取"对象行"。表里有纯字符串数组（如 TIANJIANG 十天干），不能当记录行处理。 */
const asArray = (v: unknown): Dict[] =>
  Array.isArray(v)
    ? v.filter((x): x is Dict => !!x && typeof x === 'object' && !Array.isArray(x))
    : [];
const asDict = (v: unknown): Dict => (v && typeof v === 'object' ? (v as Dict) : {});
const idsOf = (content: Dict, table: string): Set<string> => {
  const out = new Set<string>();
  for (const row of asArray(content[table])) {
    const id = row.id;
    if (typeof id === 'string' && id) out.add(id);
  }
  return out;
};
const namesOf = (content: Dict, table: string): Set<string> => {
  const out = new Set<string>();
  for (const row of asArray(content[table])) {
    const name = row.name;
    if (typeof name === 'string' && name) out.add(name);
  }
  return out;
};

function walkStrings(value: unknown, visit: (s: string) => void): void {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) walkStrings(child, visit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) walkStrings(child, visit);
  }
}

function countRecords(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return 1;
}

/* ---------- 1. 类型快照 ---------- */
function checkSchema(content: Dict, issues: Issue[]): void {
  for (const [table, schema] of Object.entries(TABLE_SCHEMAS)) {
    const parsed = schema.safeParse(content[table]);
    if (parsed.success) continue;
    for (const err of parsed.error.issues.slice(0, 4)) {
      issues.push({
        table,
        path: err.path.join('.') || '(root)',
        message: `类型与快照不符：${err.message}`,
      });
    }
  }
}

/* ---------- 2. id 唯一 / 名称非空 ---------- */
function checkIdentities(content: Dict, issues: Issue[]): void {
  for (const [table, value] of Object.entries(content)) {
    const rows = asArray(value);
    if (!rows.length) continue;
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      const id = row.id;
      if (typeof id === 'string') {
        if (!id) issues.push({ table, path: `[${i}].id`, message: 'id 为空串' });
        else if (seen.has(id)) issues.push({ table, path: `[${i}].id`, message: `id 重复：${id}` });
        else seen.add(id);
      }
      if ('name' in row) {
        const name = row.name;
        if (typeof name !== 'string' || !name.trim()) {
          issues.push({ table, path: `[${i}].name`, message: 'name 为空' });
        }
      }
    });
  }
}

/* ---------- 3. 数值域 ---------- */
function checkNumbers(content: Dict, issues: Issue[]): void {
  // 价格非负：全局唯一一条，`cost` / `stones` 不在此列——它们表示"增减量"，本来就允许为负
  for (const [table, value] of Object.entries(content)) {
    const rows = asArray(value);
    rows.forEach((row, i) => {
      if (!('price' in row)) return;
      const price = row.price;
      if (typeof price === 'number' && price < 0) {
        issues.push({ table, path: `[${i}].price`, message: `价格为负：${price}` });
      }
    });
  }

  // 品相权重必须和为 1：这是掉落期望值的唯一来源，漂了没人能看出来
  const quality = asArray(content.QUALITY);
  if (quality.length) {
    const sum = quality.reduce((acc, q) => acc + (typeof q.rate === 'number' ? q.rate : 0), 0);
    if (Math.abs(sum - 1) > 1e-9) {
      issues.push({ table: 'QUALITY', path: '[*].rate', message: `品相权重和应为 1，实际 ${sum}` });
    }
    quality.forEach((q, i) => {
      if (typeof q.rate === 'number' && (q.rate < 0 || q.rate > 1)) {
        issues.push({ table: 'QUALITY', path: `[${i}].rate`, message: `权重超出 0~1：${q.rate}` });
      }
    });
  }

  // 技艺等级：lv 递增、成功率 0~1
  let lastLv = 0;
  asArray(content.CRAFT_LEVELS).forEach((row, i) => {
    const lv = typeof row.lv === 'number' ? row.lv : 0;
    if (lv <= lastLv)
      issues.push({ table: 'CRAFT_LEVELS', path: `[${i}].lv`, message: 'lv 未递增' });
    lastLv = lv;
    if (typeof row.rate === 'number' && (row.rate < 0 || row.rate > 1)) {
      issues.push({
        table: 'CRAFT_LEVELS',
        path: `[${i}].rate`,
        message: `成功率超出 0~1：${row.rate}`,
      });
    }
  });

  // 区间表：min 不得大于 max（好感 / 锚定状态）
  for (const table of ['FAVOR_TIERS', 'ANCHOR_STATUS']) {
    asArray(content[table]).forEach((row, i) => {
      const min = row.min;
      const max = row.max;
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        issues.push({ table, path: `[${i}]`, message: `min(${min}) > max(${max})` });
      }
    });
  }

  // 回收渠道倍率必须为正，否则"卖出倒扣钱"这种荒谬结算就有了合法外衣
  asArray(content.SELL_CHANNELS).forEach((row, i) => {
    const mul = row.mul;
    if (typeof mul === 'number' && mul <= 0) {
      issues.push({
        table: 'SELL_CHANNELS',
        path: `[${i}].mul`,
        message: `渠道倍率应为正：${mul}`,
      });
    }
  });
}

/* ---------- 4. 交叉引用 ---------- */
function checkRefs(content: Dict, issues: Issue[]): void {
  const materials = idsOf(content, 'MATERIAL_EXT');
  const craftables = new Set([
    ...idsOf(content, 'PILL_EXT'),
    ...idsOf(content, 'TALISMANS'),
    ...idsOf(content, 'ARTIFACT_EXT'),
    ...idsOf(content, 'ARRAY_DISKS'),
  ]);
  const arts = idsOf(content, 'CRAFT_ARTS');
  const gongfa = idsOf(content, 'GONGFA');
  const skillNames = namesOf(content, 'SKILLS');
  const daoshu = idsOf(content, 'DAOSHU');
  const encounters = idsOf(content, 'ENCOUNTERS');
  const transmissions = idsOf(content, 'TRANSMISSIONS');

  // 配方 → 材料 / 产物
  asArray(content.RECIPES).forEach((r, i) => {
    for (const key of Object.keys(asDict(r.mats))) {
      if (!materials.has(key)) {
        issues.push({ table: 'RECIPES', path: `[${i}].mats.${key}`, message: '材料不存在' });
      }
    }
    const out = r.out;
    if (typeof out === 'string' && !craftables.has(out)) {
      issues.push({ table: 'RECIPES', path: `[${i}].out`, message: `产物不存在：${out}` });
    }
  });

  // 技艺书 → 四艺
  asArray(content.CRAFT_BOOKS).forEach((b, i) => {
    const art = b.art;
    if (typeof art === 'string' && !arts.has(art)) {
      issues.push({ table: 'CRAFT_BOOKS', path: `[${i}].art`, message: `四艺不存在：${art}` });
    }
  });

  // 坊市 → 商品；灵脉契（fudi）是地产，单独放行。货架上既有成品也有材料。
  const shopItems = new Set([...craftables, ...materials]);
  asArray(content.SHOP).forEach((s, i) => {
    const id = s.id;
    if (typeof id !== 'string' || s.type === 'land') return;
    if (!shopItems.has(id)) {
      issues.push({ table: 'SHOP', path: `[${i}].id`, message: `货架商品无对应条目：${id}` });
    }
  });
  asArray(content.SHOP_GONGFA).forEach((g, i) => {
    const id = g.id;
    if (typeof id === 'string' && !gongfa.has(id)) {
      issues.push({ table: 'SHOP_GONGFA', path: `[${i}].id`, message: `功法不存在：${id}` });
    }
  });
  asArray(content.GONGFA_EXT).forEach((g, i) => {
    const id = g.id;
    if (typeof id === 'string' && !gongfa.has(id)) {
      issues.push({ table: 'GONGFA_EXT', path: `[${i}].id`, message: `功法不存在：${id}` });
    }
  });

  // 杀招链 → 招式名（表里存的是名字不是 id，所以按 name 比）
  asArray(content.COMBOS).forEach((c, i) => {
    for (const field of ['prev', 'cur'] as const) {
      const name = c[field];
      if (typeof name === 'string' && !skillNames.has(name)) {
        issues.push({ table: 'COMBOS', path: `[${i}].${field}`, message: `招式不存在：${name}` });
      }
    }
  });

  // 奇遇/传法的 opts.act 是 `enc:<id>:<branch>` / `tx:<id>:<branch>`，指错了就是死链
  asArray(content.ENCOUNTERS).forEach((e, i) => {
    for (const opt of asArray(e.opts)) {
      const act = opt.act;
      if (typeof act === 'string' && act.startsWith('enc:')) {
        const target = act.split(':')[1] ?? '';
        if (!encounters.has(target)) {
          issues.push({
            table: 'ENCOUNTERS',
            path: `[${i}].opts.act`,
            message: `跳转目标不存在：${act}`,
          });
        }
      }
    }
    const book = asDict(e.bookOpt).book;
    if (typeof book === 'string' && !daoshu.has(book)) {
      issues.push({
        table: 'ENCOUNTERS',
        path: `[${i}].bookOpt.book`,
        message: `道书不存在：${book}`,
      });
    }
  });
  asArray(content.TRANSMISSIONS).forEach((t, i) => {
    for (const opt of asArray(t.opts)) {
      const act = opt.act;
      if (typeof act === 'string' && act.startsWith('tx:')) {
        const target = act.split(':')[1] ?? '';
        if (!transmissions.has(target)) {
          issues.push({
            table: 'TRANSMISSIONS',
            path: `[${i}].opts.act`,
            message: `跳转目标不存在：${act}`,
          });
        }
      }
    }
  });
}

/* ---------- 汇总 ---------- */
export function validateContent(content: Readonly<Record<string, unknown>> = CONTENT): {
  issues: Issue[];
  stats: ContentStats;
} {
  const dict = content as Dict;
  const issues: Issue[] = [];
  let records = 0;
  let textChars = 0;

  for (const value of Object.values(dict)) {
    records += countRecords(value);
    walkStrings(value, (s) => {
      textChars += s.length;
    });
  }

  checkSchema(dict, issues);
  checkIdentities(dict, issues);
  checkNumbers(dict, issues);
  checkRefs(dict, issues);

  return { issues, stats: { tables: Object.keys(dict).length, records, textChars } };
}
